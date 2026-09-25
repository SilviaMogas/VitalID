// Fixture until core VitalIdSnapshot is wired.
import type { VitalIdSnapshot } from './sharing';

const SOURCE = 'Demo wearable (synthetic)';

/** Fictional demo persona. All data is synthetic — not a real person. */
export function getDemoVitalId(): VitalIdSnapshot {
  return {
    identity: {
      name: 'Layla Haddad',
      dateOfBirth: '1988-03-14',
      bloodType: 'O+',
      vitalId: 'VID-DEMO-1042',
    },
    emergency: {
      emergencyContact: { name: 'Omar Haddad', relation: 'Brother', phone: '+961-3-555-0142' },
      allergies: ['Penicillin', 'Peanuts'],
      conditions: ['Mild asthma'],
      medications: ['Albuterol inhaler (as needed)'],
    },
    signals: [
      { metric: 'Resting heart rate', value: 62, unit: 'bpm', timestamp: '2025-09-25T08:10:00Z', source: SOURCE, baseline: 65, delta: -3, status: 'normal' },
      { metric: 'Heart rate variability', value: 48, unit: 'ms', timestamp: '2025-09-25T08:10:00Z', source: SOURCE, baseline: 45, delta: 3, status: 'normal' },
      { metric: 'Sleep duration', value: 7.2, unit: 'h', timestamp: '2025-09-25T06:45:00Z', source: SOURCE, baseline: 7.0, delta: 0.2, status: 'normal' },
      { metric: 'Steps', value: 8400, unit: 'steps', timestamp: '2025-09-24T22:00:00Z', source: SOURCE, baseline: 9000, delta: -600, status: 'watch' },
    ],
    trends: [
      { metric: 'Resting heart rate', period: '7D', direction: 'down', summary: 'Resting HR trending slightly down over the last 7 days.', source: 'Demo analytics (synthetic)' },
      { metric: 'Sleep duration', period: '30D', direction: 'stable', summary: 'Sleep duration stable around 7h over the last 30 days.', source: 'Demo analytics (synthetic)' },
    ],
    profile: {
      height: '168 cm',
      weight: '64 kg',
      lifestyle: ['Non-smoker', 'Regular exercise'],
      notes: 'Training for a 10K run; prefers morning workouts.',
    },
  };
}
