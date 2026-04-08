import type { ExperienceLevel } from '../types';

/** Short display name for onboarding / profile experience tier. */
export const EXPERIENCE_DISPLAY_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Recruit',
  intermediate: 'Operative',
  advanced: 'Vanguard',
  pro: 'Elite',
};
