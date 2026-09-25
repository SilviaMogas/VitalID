import 'server-only';
import { getMembershipStore } from '@/lib/membership/store';
import { getOnboardingStore } from '@/lib/onboarding/store';
import type { PlanId } from '@/lib/plans';

export interface AccountState {
  plan: PlanId;
  planSelected: boolean;
  onboardingStep: number;
  onboardingCompleted: boolean;
  firstName: string;
  /** Where the client should send this user right now. */
  next: '/pricing' | '/onboarding' | '/';
}

/**
 * Journey resolution for a signed-in user:
 *   no plan chosen yet      → /pricing
 *   onboarding not finished → /onboarding (resumes at saved step)
 *   otherwise               → dashboard
 */
export async function getAccountState(userId: string): Promise<AccountState> {
  const [membership, setup] = await Promise.all([
    getMembershipStore().upsert({ userKey: userId }),
    getOnboardingStore().get(userId),
  ]);
  const planSelected = Boolean(setup?.planSelected) || membership.plan !== 'free';
  const onboardingCompleted = Boolean(setup?.onboardingCompleted);
  const next = !planSelected ? '/pricing' : !onboardingCompleted ? '/onboarding' : '/';
  return {
    plan: membership.plan,
    planSelected,
    onboardingStep: setup?.onboardingStep ?? 1,
    onboardingCompleted,
    firstName: setup?.profile.firstName ?? '',
    next,
  };
}

export async function resolveNextRoute(userId: string): Promise<AccountState['next']> {
  return (await getAccountState(userId)).next;
}
