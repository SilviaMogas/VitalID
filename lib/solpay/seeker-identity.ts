export const seekerIdentity = {
  name: 'Vital ID',
  uri: 'https://www.vitalid.site',
  icon: 'icons/vitalid-192.png',
} as const;

export function mobileWalletMessageHeading(host: string): string {
  return `${host} wants you to sign in to the Vital ID Android app with your Solana account:`;
}
