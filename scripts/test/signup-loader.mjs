const STUBS = {
  '@/lib/membership/store': `
    export function getMembershipStore() {
      return { async upsert(row) { (globalThis.__signupWrites ??= []).push(['membership', row.userKey]); } };
    }
  `,
  '@/lib/onboarding/store': `
    export function getOnboardingStore() {
      return { async patch(userId) { (globalThis.__signupWrites ??= []).push(['onboarding', userId]); } };
    }
  `,
  '@/lib/consent': `
    export function getConsentStore() {
      return { async record(userId, type) { (globalThis.__signupWrites ??= []).push(['consent', userId, type]); } };
    }
  `,
};

export async function resolve(spec, context, nextResolve) {
  if (spec in STUBS) {
    return { url: `data:text/javascript,${encodeURIComponent(STUBS[spec])}`, shortCircuit: true };
  }
  return nextResolve(spec, context);
}
