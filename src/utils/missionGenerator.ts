import type {
  UserProfile,
  Mission,
  MissionType,
  DayOfWeek,
  ExperienceLevel,
  RunningGoal,
} from '../types';
import { MISSION_TEMPLATES } from '../constants/missions';
import {
  getXpBandForLevel,
  SCAVENGER_LEVEL_COUNT,
} from './xpCalculator';
import {
  levelTierForClassLevel,
  missionCountForClassLevel,
  setIndexForMissionIndex,
  setRangesForClassLevel,
} from '../constants/missionProgression';
import { getNextPreferredDayOccurrences, getTodayISO } from './dateUtils';
import { stripEmojis } from './stripEmojis';

// Re-export tier helpers for callers
export {
  levelTierForClassLevel,
  missionCountForClassLevel,
} from '../constants/missionProgression';

// ─── Mission Mix Rules ────────────────────────────────────────────────────────

type MissionMix = MissionType[];

function getMissionMix(
  level: ExperienceLevel,
  goal: RunningGoal,
  runsPerWeek: number,
  missionCount: number,
): MissionMix {
  const mixes: Record<ExperienceLevel, Record<number, MissionMix>> = {
    beginner: {
      1: ['easy'],
      2: ['easy', 'easy'],
      3: ['easy', 'recovery', 'easy'],
      4: ['easy', 'recovery', 'easy', 'easy'],
      5: ['easy', 'easy', 'recovery', 'easy', 'easy'],
      6: ['easy', 'recovery', 'easy', 'tempo', 'easy', 'long'],
    },
    intermediate: {
      1: ['easy'],
      2: ['easy', 'tempo'],
      3: ['easy', 'tempo', 'easy'],
      4: ['easy', 'tempo', 'recovery', 'easy'],
      5: ['easy', 'tempo', 'interval', 'recovery', 'easy'],
      6: ['easy', 'tempo', 'interval', 'recovery', 'easy', 'long'],
      9: [
        'easy',
        'tempo',
        'easy',
        'recovery',
        'tempo',
        'interval',
        'easy',
        'tempo',
        'long',
      ],
    },
    advanced: {
      1: ['tempo'],
      2: ['tempo', 'easy'],
      3: ['tempo', 'interval', 'easy'],
      4: ['tempo', 'interval', 'easy', 'long'],
      5: ['long', 'tempo', 'interval', 'easy', 'recovery'],
      6: ['tempo', 'interval', 'easy', 'long', 'tempo', 'recovery'],
      9: [
        'tempo',
        'interval',
        'easy',
        'long',
        'tempo',
        'recovery',
        'interval',
        'easy',
        'long',
      ],
      12: [
        'tempo',
        'interval',
        'easy',
        'long',
        'tempo',
        'interval',
        'recovery',
        'long',
        'tempo',
        'interval',
        'easy',
        'long',
      ],
    },
    pro: {
      1: ['tempo'],
      2: ['tempo', 'interval'],
      3: ['tempo', 'interval', 'long'],
      4: ['long', 'tempo', 'interval', 'easy'],
      5: ['long', 'tempo', 'interval', 'tempo', 'long'],
      6: ['long', 'tempo', 'interval', 'tempo', 'interval', 'long'],
      9: [
        'long',
        'tempo',
        'interval',
        'tempo',
        'long',
        'interval',
        'tempo',
        'interval',
        'long',
      ],
      12: [
        'long',
        'tempo',
        'interval',
        'tempo',
        'long',
        'interval',
        'tempo',
        'long',
        'interval',
        'tempo',
        'long',
        'interval',
      ],
    },
  };

  const byCount = mixes[level][missionCount];
  const baseMix =
    byCount ??
    mixes[level][runsPerWeek] ??
    mixes[level][6] ??
    mixes[level][3] ?? ['easy', 'recovery', 'easy'];

  if (goal === 'race' || goal === 'distance') {
    if (!baseMix.includes('long') && baseMix.length >= 3) {
      const easyIdx = baseMix.lastIndexOf('easy');
      if (easyIdx !== -1) {
        const result = [...baseMix];
        result[easyIdx] = 'long';
        return result as MissionMix;
      }
    }
  }

  if (goal === 'speed') {
    if (!baseMix.includes('interval') && baseMix.length >= 3) {
      const result = [...baseMix];
      const easyIdx = result.indexOf('easy');
      if (easyIdx !== -1) result[easyIdx] = 'interval';
      return result as MissionMix;
    }
  }

  if (goal === 'habit' || goal === 'consistency') {
    return baseMix.map((t) => (t === 'interval' ? 'easy' : t)) as MissionMix;
  }

  return baseMix;
}

/** XP per mission (base, before streak / overdistance), strictly increasing, sums to level band. */
export function distributeBaseXpForLevel(
  classLevel: number,
  missionCount: number,
): number[] {
  const band = getXpBandForLevel(classLevel);
  const n = missionCount;
  if (n <= 0) return [];
  if (n === 1) return [band];

  const weights = Array.from({ length: n }, (_, i) => i + 1);
  const sumW = (n * (n + 1)) / 2;
  const alloc = weights.map((w) => Math.max(1, Math.floor((band * w) / sumW)));
  for (let i = 1; i < n; i++) {
    if (alloc[i]! <= alloc[i - 1]!) alloc[i] = alloc[i - 1]! + 1;
  }
  let s = alloc.reduce((a, b) => a + b, 0);
  let pos = n - 1;
  let guard = 0;
  while (s < band && guard < band + n) {
    alloc[pos] = alloc[pos]! + 1;
    s++;
    if (pos > 0 && alloc[pos]! <= alloc[pos - 1]!) {
      alloc[pos] = alloc[pos - 1]! + 1;
    }
    pos = (pos - 1 + n) % n;
    guard++;
  }
  pos = n - 1;
  guard = 0;
  while (s > band && guard < band + n) {
    const minV = pos === 0 ? 1 : alloc[pos - 1]! + 1;
    if (alloc[pos]! > minV) {
      alloc[pos] = alloc[pos]! - 1;
      s--;
    }
    pos--;
    if (pos < 0) pos = n - 1;
    guard++;
  }
  return alloc;
}

// ─── Target distance / duration per mission type ─────────────────────────────

export interface MissionTargets {
  distanceKm: number;
  durationMin: number;
  cyclingDistanceKm: number;
  cyclingDurationMin: number;
}

/**
 * Game-level 1 (Recruit) run targets — short distances; 5 min time window.
 */
export const RECRUIT_TARGET_DISTANCES_KM: Record<MissionType, number> = {
  easy: 0.4,
  recovery: 0.3,
  tempo: 0.45,
  interval: 0.5,
  long: 0.5,
};

/** Per-tier step for difficulty ramp within a pack (distance multiplier spread). */
function indexScaleStep(tier: ExperienceLevel): number {
  switch (tier) {
    case 'beginner':
      return 0.035;
    case 'intermediate':
      return 0.048;
    case 'advanced':
      return 0.062;
    case 'pro':
      return 0.078;
    default:
      return 0.05;
  }
}

function getTargets(
  type: MissionType,
  level: ExperienceLevel,
  classLevel: number,
  missionIndexInPack: number,
  missionCount: number,
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

  const cappedLevel = Math.max(2, Math.min(SCAVENGER_LEVEL_COUNT, classLevel));
  const baseDistanceByLevel: Record<number, number> = {
    2: 1.0,
    3: 1.5,
    4: 2.0,
    5: 2.5,
    6: 3.0,
    7: 3.5,
    8: 4.0,
    9: 4.5,
    10: 5.0,
    11: 6.0,
    12: 7.0,
    13: 8.0,
    14: 9.0,
    15: 10.0,
  };
  const basePaceMinPerKmByTier: Record<ExperienceLevel, number> = {
    beginner: 6.8,
    intermediate: 6.0,
    advanced: 5.2,
    pro: 4.9,
  };
  const distanceTypeMultiplier: Record<MissionType, number> = {
    recovery: 0.8,
    easy: 1.0,
    tempo: 1.0,
    interval: 0.9,
    long: 1.3,
  };
  const durationTypePaceAdj: Record<MissionType, number> = {
    recovery: 1.07,
    easy: 1.0,
    tempo: 0.95,
    interval: 0.9,
    long: 1.03,
  };
  const baseDistanceKm =
    cappedLevel <= 15
      ? (baseDistanceByLevel[cappedLevel] ?? 5)
      : 10 + (cappedLevel - 15);

  const denom = Math.max(1, missionCount - 1);
  const t = missionIndexInPack / denom;
  const step = indexScaleStep(level);
  const indexScale = 1 + t * step * (missionCount - 1);

  const distanceKm =
    Math.round(
      baseDistanceKm * distanceTypeMultiplier[type] * indexScale * 10,
    ) / 10;
  const pace = basePaceMinPerKmByTier[level] * durationTypePaceAdj[type];
  const durationMin = Math.max(5, Math.round(distanceKm * pace));
  return {
    distanceKm,
    durationMin,
    cyclingDistanceKm: Math.round(distanceKm * 2.5 * 10) / 10,
    cyclingDurationMin: durationMin,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function buildMission(
  type: MissionType,
  day: DayOfWeek,
  scheduledDate: string,
  level: ExperienceLevel,
  index: number,
  classLevel: number,
  missionCount: number,
  xpReward: number,
  setIndex: number,
): Mission {
  const template = MISSION_TEMPLATES[type];
  const targets = getTargets(type, level, classLevel, index, missionCount);
  const variant = template.variants?.length ? pick(template.variants) : null;

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
    xpReward,
    day,
    scheduledDate,
    status: 'upcoming',
    setIndex,
  };
}

/** @deprecated Use levelTierForClassLevel from missionProgression. */
export function experienceTierForClassLevel(classLevel: number): ExperienceLevel {
  return levelTierForClassLevel(classLevel);
}

/** Targets for a mission type at a class level (history fallback when queue was regenerated). */
export function getMissionTargetsForClassLevel(
  type: MissionType,
  classLevel: number,
  missionIndexInPack: number = 0,
): MissionTargets {
  const level = levelTierForClassLevel(classLevel);
  const n = missionCountForClassLevel(classLevel);
  return getTargets(type, level, classLevel, missionIndexInPack, n);
}

/**
 * Derive locked / active / upcoming from completion state + set layout.
 * First incomplete mission is active (or stays aborted); later missions in future sets are locked.
 */
export function recomputeMissionStatuses(
  missions: Mission[],
  classLevel: number,
): Mission[] {
  const n = missions.length;
  if (n === 0) return missions;

  const ranges = setRangesForClassLevel(classLevel, n);

  const isSetComplete = (setIdx: number): boolean => {
    const range = ranges[setIdx];
    if (!range) return true;
    const [a, b] = range;
    for (let j = a; j <= b; j++) {
      if (missions[j]?.status !== 'completed') return false;
    }
    return true;
  };

  const missionIsInLockedSet = (idx: number): boolean => {
    const mySet = ranges.findIndex(([a, b]) => idx >= a && idx <= b);
    for (let s = 0; s < mySet; s++) {
      if (!isSetComplete(s)) return true;
    }
    return false;
  };

  const firstIncomplete = missions.findIndex((m) => m.status !== 'completed');

  return missions.map((m, i) => {
    if (m.status === 'completed') return m;
    if (missionIsInLockedSet(i)) return { ...m, status: 'locked' as const };
    if (firstIncomplete === -1) return { ...m, status: 'upcoming' as const };
    if (i < firstIncomplete) return m;
    if (i === firstIncomplete) {
      if (m.status === 'aborted') return m;
      return { ...m, status: 'active' as const };
    }
    return { ...m, status: 'upcoming' as const };
  });
}

/**
 * Build the ordered mission queue from onboarding profile and mission ladder level.
 * `classLevel` is 1-based (mission pack id).
 */
export function generateMissionsFromProfile(
  profile: UserProfile,
  classLevel: number,
): Mission[] {
  const {
    runningGoal = 'consistency',
    weeklyTargetMode,
    weeklyTargetRuns,
    preferredDays,
  } = profile;

  const experienceLevel = levelTierForClassLevel(classLevel);

  const runsPerWeek =
    weeklyTargetMode === 'runs'
      ? Math.min(weeklyTargetRuns ?? preferredDays.length, preferredDays.length)
      : preferredDays.length;

  const activeDays = preferredDays.slice(0, runsPerWeek);
  const missionCount = missionCountForClassLevel(classLevel);
  const missionMix = getMissionMix(
    experienceLevel,
    runningGoal,
    runsPerWeek,
    missionCount,
  );
  const scheduledDates = getNextPreferredDayOccurrences(activeDays, missionCount);
  const today = getTodayISO();
  const baseXpList = distributeBaseXpForLevel(classLevel, missionCount);

  const missionTypes = Array.from({ length: missionCount }, (_, idx) => {
    return missionMix[idx % missionMix.length] ?? 'easy';
  });

  const raw = missionTypes.map((type, idx) => {
    const date = scheduledDates[idx] ?? today;
    const day = activeDays[idx] ?? activeDays[0] ?? 'Mon';
    const si = setIndexForMissionIndex(classLevel, idx);
    return buildMission(
      type,
      day,
      date,
      experienceLevel,
      idx,
      classLevel,
      missionCount,
      baseXpList[idx] ?? 100,
      si,
    );
  });

  return recomputeMissionStatuses(raw, classLevel);
}

/** @deprecated Prefer generateMissionsFromProfile(profile, classLevel). */
export function generateWeekMissions(profile: UserProfile): Mission[] {
  return generateMissionsFromProfile(profile, 1);
}

/** First mission in list order that is not completed (skips locked). */
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
  return (
    missions
      .slice(idx + 1)
      .find(
        (m) => m.status !== 'completed' && m.status !== 'locked',
      ) ?? null
  );
}
