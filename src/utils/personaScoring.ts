import type {
  ActivityMode,
  CycleDistanceAnswer,
  DistanceCapacityAnswer,
  DayOfWeek,
  ExperienceAnswer,
  ExperienceLevel,
  GoalAnswer,
  PersonaId,
  RunDistanceAnswer,
  RunningGoal,
  SustainablePaceAnswer,
} from '../types';
import { SCAVENGER_LEVEL_COUNT } from './xpCalculator';

/** Training days per week (1–7) from onboarding slider; legacy 0 may still appear in stored data. */
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

/** Map onboarding experience answer → profile experience tier (profile / UI labels). */
export function experienceAnswerToLevel(answer: ExperienceAnswer): ExperienceLevel {
  switch (answer) {
    case 'never':
    case 'lt3m':
      return 'beginner';
    case '3-12m':
      return 'intermediate';
    case '1-3y':
    case '3yplus':
      return 'advanced';
    default:
      return 'beginner';
  }
}

/** Infer experience tier from volume + goal when the dedicated experience step is omitted (3-step onboarding). */
export function inferExperienceFromVolumeAndGoal(
  goal: GoalAnswer,
  trainingDaysPerWeek: number,
  mode: ActivityMode,
  runDistance: RunDistanceAnswer | null,
  cycleDistance: CycleDistanceAnswer | null,
): ExperienceAnswer {
  const days = trainingDaysPerWeek;
  let score = frequencyScore(days) + effortScore(goal);
  if (mode === 'run' && runDistance != null) score += distanceScoreRun(runDistance);
  if (mode === 'cycle' && cycleDistance != null) score += distanceScoreCycle(cycleDistance);
  if (score <= 3) return 'never';
  if (score <= 5) return 'lt3m';
  if (score <= 7) return '3-12m';
  if (score <= 9) return '1-3y';
  return '3yplus';
}

export function goalAnswerToRunningGoal(goal: GoalAnswer): RunningGoal {
  switch (goal) {
    case 'started':
      return 'habit';
    case 'fit':
      return 'consistency';
    case 'endurance':
      return 'distance';
    case 'speed':
      return 'speed';
    case 'event':
      return 'race';
    default:
      return 'consistency';
  }
}

function distanceCapacityScore(answer: DistanceCapacityAnswer): number {
  const map: Record<DistanceCapacityAnswer, number> = {
    none: 0,
    up_to_1: 1,
    '1_3': 2,
    '3_5': 3,
    '5_10': 4,
    '10_plus': 5,
  };
  return map[answer];
}

function sustainablePaceScore(answer: SustainablePaceAnswer): number {
  const map: Record<SustainablePaceAnswer, number> = {
    unknown: 0,
    slower_than_7: 1,
    '6_to_7': 2,
    '5_to_6': 3,
    faster_than_5: 4,
  };
  return map[answer];
}

/**
 * Map onboarding distance + pace to starting class level (1..SCAVENGER_LEVEL_COUNT).
 * Uses full ladder while keeping low-confidence answers in early levels.
 */
export function startingClassLevelFromDistanceAndPace(
  distance: DistanceCapacityAnswer,
  pace: SustainablePaceAnswer,
): number {
  const composite = distanceCapacityScore(distance) * 2 + sustainablePaceScore(pace); // 0..14
  const level = 1 + composite;
  return Math.max(1, Math.min(SCAVENGER_LEVEL_COUNT, level));
}

/** Linear class progression for evolution UI and dev tools (ghost → … → vanguard). */
export const PERSONA_PROGRESSION_ORDER: PersonaId[] = [
  'ghost',
  'scout',
  'operative',
  'elite',
  'vanguard',
];

export function nextPersonaId(personaId: PersonaId): PersonaId | null {
  const i = PERSONA_PROGRESSION_ORDER.indexOf(personaId);
  if (i < 0 || i >= PERSONA_PROGRESSION_ORDER.length - 1) return null;
  return PERSONA_PROGRESSION_ORDER[i + 1]!;
}
