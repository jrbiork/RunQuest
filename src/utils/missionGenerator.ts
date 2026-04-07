import type {
  UserProfile,
  Mission,
  MissionType,
  DayOfWeek,
  ExperienceLevel,
  RunningGoal,
} from '../types';
import { MISSION_TEMPLATES } from '../constants/missions';
import { BASE_XP } from './xpCalculator';
import { getNextPreferredDayOccurrences, getTodayISO } from './dateUtils';
import { stripEmojis } from './stripEmojis';

// ─── Mission Mix Rules ────────────────────────────────────────────────────────

type MissionMix = MissionType[];

function getMissionMix(
  level: ExperienceLevel,
  goal: RunningGoal,
  runsPerWeek: number,
): MissionMix {
  // Base mixes by experience
  const mixes: Record<ExperienceLevel, Record<number, MissionMix>> = {
    beginner: {
      1: ['easy'],
      2: ['easy', 'easy'],
      3: ['easy', 'recovery', 'easy'],
      4: ['easy', 'recovery', 'easy', 'easy'],
      5: ['easy', 'easy', 'recovery', 'easy', 'easy'],
    },
    intermediate: {
      1: ['easy'],
      2: ['easy', 'tempo'],
      3: ['easy', 'tempo', 'easy'],
      4: ['easy', 'tempo', 'recovery', 'easy'],
      5: ['easy', 'tempo', 'interval', 'recovery', 'easy'],
    },
    advanced: {
      1: ['tempo'],
      2: ['tempo', 'easy'],
      3: ['tempo', 'interval', 'easy'],
      4: ['tempo', 'interval', 'easy', 'long'],
      5: ['long', 'tempo', 'interval', 'easy', 'recovery'],
    },
  };

  const baseMix = mixes[level][runsPerWeek] ??
    mixes[level][3] ?? ['easy', 'recovery', 'easy'];

  // Adjust for specific goals
  if (goal === 'race' || goal === 'distance') {
    // Swap one 'easy' for 'long' if not already present and runs >= 3
    if (!baseMix.includes('long') && runsPerWeek >= 3) {
      const easyIdx = baseMix.lastIndexOf('easy');
      if (easyIdx !== -1) {
        const result = [...baseMix];
        result[easyIdx] = 'long';
        return result as MissionMix;
      }
    }
  }

  if (goal === 'speed') {
    // Add interval if not present
    if (!baseMix.includes('interval') && runsPerWeek >= 3) {
      const result = [...baseMix];
      const easyIdx = result.indexOf('easy');
      if (easyIdx !== -1) result[easyIdx] = 'interval';
      return result as MissionMix;
    }
  }

  if (goal === 'habit' || goal === 'consistency') {
    // Keep it easy and achievable
    return baseMix.map((t) => (t === 'interval' ? 'easy' : t)) as MissionMix;
  }

  return baseMix;
}

// ─── Target distance / duration per mission type ─────────────────────────────

interface MissionTargets {
  distanceKm: number;
  durationMin: number;
  cyclingDistanceKm: number;
  cyclingDurationMin: number;
}

/**
 * Game-level 1 (Recruit) run targets — 300–500 m for testing; 5 min time window.
 * Matches `LEVEL_CLASS_TITLES[0]` in xpCalculator.
 */
export const RECRUIT_TARGET_DISTANCES_KM: Record<MissionType, number> = {
  easy: 0.4,
  recovery: 0.3,
  tempo: 0.45,
  interval: 0.5,
  long: 0.5,
};

function getTargets(
  type: MissionType,
  level: ExperienceLevel,
  classLevel: number,
): MissionTargets {
  if (classLevel === 1) {
    const distanceKm = RECRUIT_TARGET_DISTANCES_KM[type];
    return {
      distanceKm,
      durationMin: 5,
      cyclingDistanceKm: Math.round(distanceKm * 2.5 * 10) / 10,
      cyclingDurationMin: 5,
    };
  }

  // Running targets (kept at 1km/5min for easy testing above Recruit)
  const runTargets: Record<ExperienceLevel, Record<MissionType, { distanceKm: number; durationMin: number }>> = {
    beginner: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
    intermediate: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
    advanced: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
  };
  const run = runTargets[level][type]!;
  return {
    distanceKm: run.distanceKm,
    durationMin: run.durationMin,
    // Cycling covers ~2.5× the distance in the same time
    cyclingDistanceKm: Math.round(run.distanceKm * 2.5 * 10) / 10,
    cyclingDurationMin: run.durationMin,
  };
}

// ─── Pick a random item from an array ────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ─── Build a single Mission object ───────────────────────────────────────────

function buildMission(
  type: MissionType,
  day: DayOfWeek,
  scheduledDate: string,
  level: ExperienceLevel,
  index: number,
  classLevel: number,
): Mission {
  const template = MISSION_TEMPLATES[type];
  const targets = getTargets(type, level, classLevel);
  const variant = template.variants?.length ? pick(template.variants) : null;

  // Sequential path only — Run / Journey use first incomplete mission, not calendar day.
  const status: Mission['status'] = index === 0 ? 'active' : 'upcoming';

  const rawTitle = variant?.title ?? pick(template.titles);
  const rawSubtitle = variant?.subtitle ?? pick(template.subtitles);
  const rawDescription = variant?.description ?? pick(template.descriptions);

  return {
    id: `mission-L${classLevel}-i${index}-${scheduledDate}-${type}`,
    type,
    title: stripEmojis(rawTitle),
    subtitle: stripEmojis(rawSubtitle),
    description: stripEmojis(rawDescription),
    ...(variant?.audioCues ? { audioCues: variant.audioCues } : {}),
    targetDistanceKm: targets.distanceKm,
    targetDurationMin: targets.durationMin,
    targetCyclingDistanceKm: targets.cyclingDistanceKm,
    targetCyclingDurationMin: targets.cyclingDurationMin,
    xpReward: BASE_XP[type],
    day,
    scheduledDate,
    status,
  };
}

// ─── Level → mission difficulty tier ────────────────────────────────────

/** Map game level (1…15) to mission generator experience band. */
export function experienceTierForClassLevel(classLevel: number): ExperienceLevel {
  if (classLevel <= 5) return 'beginner';
  if (classLevel <= 10) return 'intermediate';
  return 'advanced';
}

/** Targets for a mission type at a class level (used when history no longer has live queue data). */
export function getMissionTargetsForClassLevel(
  type: MissionType,
  classLevel: number,
): MissionTargets {
  const level = experienceTierForClassLevel(classLevel);
  return getTargets(type, level, classLevel);
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Build the ordered mission queue from onboarding profile and current level.
 * `classLevel` is the user's game level (1-based) used for difficulty scaling.
 */
export function generateMissionsFromProfile(profile: UserProfile, classLevel: number): Mission[] {
  const {
    runningGoal = 'consistency',
    weeklyTargetMode,
    weeklyTargetRuns,
    preferredDays,
  } = profile;

  const experienceLevel = experienceTierForClassLevel(classLevel);

  const runsPerWeek =
    weeklyTargetMode === 'runs'
      ? Math.min(weeklyTargetRuns ?? preferredDays.length, preferredDays.length)
      : preferredDays.length;

  const activeDays = preferredDays.slice(0, runsPerWeek);
  const missionMix = getMissionMix(experienceLevel, runningGoal, runsPerWeek);
  const scheduledDates = getNextPreferredDayOccurrences(activeDays, missionMix.length);
  const today = getTodayISO();

  return missionMix.map((type, idx) => {
    const date = scheduledDates[idx] ?? today;
    const day = activeDays[idx] ?? activeDays[0] ?? 'Mon';
    return buildMission(type, day, date, experienceLevel, idx, classLevel);
  });
}

/** @deprecated Prefer generateMissionsFromProfile(profile, classLevel). */
export function generateWeekMissions(profile: UserProfile): Mission[] {
  return generateMissionsFromProfile(profile, 1);
}

// ─── Next mission in journey order (same order as Journey list) ───────────────

/** First mission in list order that is not completed (skips locked). Ignores calendar dates. */
export function getNextIncompleteMission(missions: Mission[]): Mission | null {
  const next = missions.find(
    (m) => m.status !== 'completed' && m.status !== 'locked',
  );
  return next ?? null;
}

/** @deprecated Use getNextIncompleteMission — name kept for older call sites */
export function getTodaysMission(missions: Mission[]): Mission | null {
  return getNextIncompleteMission(missions);
}

export function getNextMission(
  missions: Mission[],
  afterId: string,
): Mission | null {
  const idx = missions.findIndex((m) => m.id === afterId);
  if (idx === -1) return null;
  return missions.slice(idx + 1).find((m) => m.status !== 'completed') ?? null;
}
