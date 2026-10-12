export function getConsentStore() {
  return {
    async latest() {
      if (globalThis.__wellnessConsentError) throw new Error("consent store failed");
      return globalThis.__wellnessConsent ? {
        health_data: { policyVersion: globalThis.__wellnessConsentVersion },
      } : null;
    },
  };
}
