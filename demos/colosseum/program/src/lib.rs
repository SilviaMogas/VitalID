use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

const LEN: usize = 74;
const SEED: &[u8] = b"vitalid-permit";
entrypoint!(process_instruction);

fn address(program: &Pubkey, reference: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED, reference], program)
}

fn validate_account(program: &Pubkey, account: &AccountInfo, reference: &[u8]) -> ProgramResult {
    if account.owner != program || account.data_len() != LEN
        || *account.key != address(program, reference).0
    {
        return Err(ProgramError::InvalidAccountData);
    }
    let data = account.try_borrow_data()?;
    if data[0] != 1 || &data[1..33] != reference || data[73] > 1 {
        return Err(ProgramError::InvalidAccountData);
    }
    Ok(())
}

pub fn process_instruction(
    program: &Pubkey, accounts: &[AccountInfo], instruction: &[u8],
) -> ProgramResult {
    let (&tag, rest) = instruction.split_first().ok_or(ProgramError::InvalidInstructionData)?;
    let iter = &mut accounts.iter();
    match tag {
        0 => {
            if rest.len() != 40 { return Err(ProgramError::InvalidInstructionData); }
            let reference = &rest[..32];
            let expiry = i64::from_le_bytes(rest[32..].try_into().unwrap());
            let now = Clock::get()?.unix_timestamp;
            if expiry <= now || expiry > now + 3600 {
                return Err(ProgramError::InvalidArgument);
            }
            let payer = next_account_info(iter)?;
            let controller = next_account_info(iter)?;
            let permission = next_account_info(iter)?;
            let system = next_account_info(iter)?;
            if !payer.is_signer || !controller.is_signer {
                return Err(ProgramError::MissingRequiredSignature);
            }
            let (expected, bump) = address(program, reference);
            if *permission.key != expected || *system.key != system_program::id() {
                return Err(ProgramError::InvalidArgument);
            }
            // No close/reset/update instruction: an initialized reference cannot be reused.
            if !permission.data_is_empty() {
                return Err(ProgramError::AccountAlreadyInitialized);
            }
            invoke_signed(
                &system_instruction::create_account(
                    payer.key, permission.key, Rent::get()?.minimum_balance(LEN), LEN as u64, program,
                ),
                &[payer.clone(), permission.clone(), system.clone()],
                &[&[SEED, reference, &[bump]]],
            )?;
            let mut data = permission.try_borrow_mut_data()?;
            data[0] = 1;
            data[1..33].copy_from_slice(reference);
            data[33..65].copy_from_slice(controller.key.as_ref());
            data[65..73].copy_from_slice(&expiry.to_le_bytes());
            data[73] = 0;
        }
        1 => {
            if rest.len() != 32 { return Err(ProgramError::InvalidInstructionData); }
            let controller = next_account_info(iter)?;
            let permission = next_account_info(iter)?;
            if !controller.is_signer { return Err(ProgramError::MissingRequiredSignature); }
            validate_account(program, permission, rest)?;
            let mut data = permission.try_borrow_mut_data()?;
            if &data[33..65] != controller.key.as_ref() {
                return Err(ProgramError::IllegalOwner);
            }
            data[73] = 1;
        }
        2 => {
            if rest.len() != 32 { return Err(ProgramError::InvalidInstructionData); }
            let permission = next_account_info(iter)?;
            validate_account(program, permission, rest)?;
            let data = permission.try_borrow_data()?;
            let expiry = i64::from_le_bytes(data[65..73].try_into().unwrap());
            if data[73] != 0 || expiry <= Clock::get()?.unix_timestamp {
                return Err(ProgramError::InvalidAccountData);
            }
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permission_address_is_deterministic_and_reference_bound() {
        let program = Pubkey::new_unique();
        let first = [1_u8; 32];
        let second = [2_u8; 32];
        assert_eq!(address(&program, &first), address(&program, &first));
        assert_ne!(address(&program, &first).0, address(&program, &second).0);
    }

    #[test]
    fn malformed_instructions_fail_before_account_processing() {
        let program = Pubkey::new_unique();
        assert_eq!(
            process_instruction(&program, &[], &[]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            process_instruction(&program, &[], &[0]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            process_instruction(&program, &[], &[1]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            process_instruction(&program, &[], &[2]),
            Err(ProgramError::InvalidInstructionData),
        );
        assert_eq!(
            process_instruction(&program, &[], &[255]),
            Err(ProgramError::InvalidInstructionData),
        );
    }
}
