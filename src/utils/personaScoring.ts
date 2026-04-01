import type {
  ActivityMode,
  CycleDistanceAnswer,
  DayOfWeek,
  ExperienceAnswer,
  GoalAnswer,
  PersonaId,
  RunDistanceAnswer,
} from '../types';

/** Training days per week (0–7) from onboarding slider. */
export type TrainingFrequencyDays = number;

export interface PersonaSurveyAnswers {
  defaultActivityMode: ActivityMode;
  trainingDaysPerWeek: TrainingFrequencyDays;
  runDistance: RunDistanceAnswer | null;
  cycleDistance: CycleDistanceAnswer | null;
  experience: ExperienceAnswer;
  goal: GoalAnswer;
}

const ALL_WEEK_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Maps slider → preferred mission days (first N weekdays). If 0, use Mon/Wed/Fri so campaigns always schedule. */
export function preferredDaysFromScheduleDays(n: number): DayOfWeek[] {
  const capped = Math.min(7, Math.max(0, Math.round(n)));
  if (capped === 0) return ['Mon', 'Wed', 'Fri'];
  return ALL_WEEK_DAYS.slice(0, capped);
}

function frequencyScore(days: number): number {
  if (days <= 0) return 0;
  if (days <= 2) return 1;
  if (days <= 4) return 2;
  return 3;
}

/** Recent activity 0–2: training frequency signal. */
function recentActivityScore(days: number): number {
  if (days >= 6) return 2;
  if (days >= 3) return 1;
  return 0;
}

function distanceScoreRun(d: RunDistanceAnswer): number {
  const map: Record<RunDistanceAnswer, number> = {
    lt3: 0,
    '3-5': 1,
    '5-10': 2,
    '10plus': 3,
  };
  return map[d];
}

function distanceScoreCycle(d: CycleDistanceAnswer): number {
  const map: Record<CycleDistanceAnswer, number> = {
    lt10: 0,
    '10-25': 1,
    '25-60': 2,
    '60plus': 3,
  };
  return map[d];
}

function experienceScore(e: ExperienceAnswer): number {
  switch (e) {
    case 'never':
    case 'lt3m':
      return 0;
    case '3-12m':
      return 1;
    case '1-3y':
    case '3yplus':
      return 2;
    default:
      return 0;
  }
}

function effortScore(g: GoalAnswer): number {
  switch (g) {
    case 'started':
      return 0;
    case 'fit':
      return 1;
    case 'endurance':
      return 2;
    case 'speed':
    case 'event':
      return 3;
    default:
      return 0;
  }
}

export function computePersonaScore(answers: PersonaSurveyAnswers): number {
  const days = answers.trainingDaysPerWeek;
  const freq = frequencyScore(days);
  const recent = recentActivityScore(days);
  const dist =
    answers.defaultActivityMode === 'cycle'
      ? answers.cycleDistance != null
        ? distanceScoreCycle(answers.cycleDistance)
        : 0
      : answers.runDistance != null
        ? distanceScoreRun(answers.runDistance)
        : 0;
  const effort = effortScore(answers.goal);
  const exp = experienceScore(answers.experience);
  return freq + recent + dist + effort + exp;
}

/** Map total score band → persona used by campaigns. */
export function personaIdFromScore(total: number): PersonaId {
  if (total <= 3) return 'ghost';
  if (total <= 6) return 'scout';
  if (total <= 9) return 'operative';
  if (total <= 12) return 'elite';
  return 'vanguard';
}

export function computePersonaId(answers: PersonaSurveyAnswers): PersonaId {
  return personaIdFromScore(computePersonaScore(answers));
}
