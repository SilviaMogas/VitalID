import {DEMO_IDENTITY, DEMO_PROFILE, getDailyRecords} from '../../../lib/demo-data.ts';

export function syntheticFixture() {
  return structuredClone({
    name: DEMO_IDENTITY.fullName,
    records: getDailyRecords(),
    summary: {
      identity: {fullName: DEMO_IDENTITY.fullName},
      healthProfile: {heightCm: DEMO_PROFILE.heightCm, weightKg: DEMO_PROFILE.weightKg},
    },
  });
}
