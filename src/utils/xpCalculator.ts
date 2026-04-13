import type { MissionType, LevelInfo } from '../types';

// ─── Base XP Per Mission Type ─────────────────────────────────────────────────

export const BASE_XP: Record<MissionType, number> = {
  easy: 100,
  recovery: 100,
  tempo: 150,
  interval: 150,
  long: 220,
};

// ─── Level Thresholds (cumulative XP to reach each level) ───────────────

const LEVEL_THRESHOLDS = [
  0, 150, 350, 650, 1050, 1550, 2200, 3000, 4000, 5250, 6750, 8500, 10500,
  12800, 15400,
  // Post-Sovereign (levels 16–25); 26–30 continue above
  18200, 21200, 24500, 28200, 32400, 37200, 42800, 49400, 57200, 66500,
  // Post-Ultima (levels 26–30)
  77500, 90500, 106000, 124500, 146500,
];

/** Number of levels (1 … MAX inclusive). */
export const SCAVENGER_LEVEL_COUNT = LEVEL_THRESHOLDS.length;

/** XP to earn from min XP at `level` to min XP at `level + 1` (1-based mission pack level). */
export function getXpBandForLevel(level: number): number {
  const L = Math.max(1, Math.min(SCAVENGER_LEVEL_COUNT, Math.floor(level)));
  if (L >= SCAVENGER_LEVEL_COUNT) {
    const last = LEVEL_THRESHOLDS[SCAVENGER_LEVEL_COUNT - 1] ?? 0;
    const prev = LEVEL_THRESHOLDS[SCAVENGER_LEVEL_COUNT - 2] ?? 0;
    return Math.max(0, last - prev);
  }
  return (LEVEL_THRESHOLDS[L] ?? 0) - (LEVEL_THRESHOLDS[L - 1] ?? 0);
}

/** Minimum cumulative XP required to be at the provided 1-based level. */
export function getMinXpForLevel(level: number): number {
  const idx = Math.min(
    LEVEL_THRESHOLDS.length - 1,
    Math.max(0, Math.floor(level) - 1),
  );
  return LEVEL_THRESHOLDS[idx] ?? 0;
}

/** Add onboarding baseline so displayed level/progress starts at assigned class. */
export function getDisplayXpWithStartingLevelOffset(
  totalXp: number,
  startingClassLevel?: number,
): number {
  if (!startingClassLevel || startingClassLevel <= 1) return totalXp;
  return totalXp + getMinXpForLevel(startingClassLevel);
}

/** Display names — full level ladder (one per threshold row). */
export const LEVEL_CLASS_TITLES = [
  'Recruit',
  'Drifter',
  'Survivor',
  'Runner',
  'Pathfinder',
  'Scout',
  'Ranger',
  'Tracker',
  'Messenger',
  'Outrider',
  'Vanguard',
  'Strider',
  'Pacer',
  'Endurer',
  'Responder',
  'Operative',
  'Striker',
  'Guardian',
  'Sentinel',
  'Enforcer',
  'Commander',
  'Elite',
  'Apex',
  'Overrunner',
  'Ghost',
  'Revenant',
  'Warbringer',
  'Legend',
  'Titan',
  'Last Hope',
] as const;

/** Primary accent per level (hex), aligned with LEVEL_THRESHOLDS indices. */
export const LEVEL_CLASS_ACCENTS = [
  '#6B7280',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#F97316',
  '#EAB308',
  '#F59E0B',
  '#10B981',
  '#FBBF24',
  '#8B5CF6',
  '#F472B6',
  '#38BDF8',
  '#C084FC',
  '#FDE047',
  '#FB923C',
  '#34D399',
  '#818CF8',
  '#2DD4BF',
  '#FACC15',
  '#E879F9',
  '#5EEAD4',
  '#A5B4FC',
  '#FDE68A',
  '#FB7185',
  '#4A0000',
] as const;

export function getLevelAccentForIndex(levelIndex0: number): string {
  return (
    LEVEL_CLASS_ACCENTS[levelIndex0] ??
    LEVEL_CLASS_ACCENTS[LEVEL_CLASS_ACCENTS.length - 1]!
  );
}

export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= (LEVEL_THRESHOLDS[i] as number)) {
      level = i + 1;
    } else {
      break;
    }
  }

  const levelIdx = level - 1;
  const xpAtLevelStart = LEVEL_THRESHOLDS[levelIdx] ?? 0;
  const xpAtNextLevel =
    LEVEL_THRESHOLDS[level] ??
    LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ??
    66500;

  const xpInLevel = totalXp - xpAtLevelStart;
  const xpToNextLevel = xpAtNextLevel - xpAtLevelStart;
  const isMaxLevel = level >= SCAVENGER_LEVEL_COUNT;
  const progress =
    isMaxLevel || xpToNextLevel <= 0
      ? 1
      : Math.min(xpInLevel / xpToNextLevel, 1);

  return {
    level,
    title:
      LEVEL_CLASS_TITLES[levelIdx] ??
      LEVEL_CLASS_TITLES[LEVEL_CLASS_TITLES.length - 1] ??
      'Omega',
    accentColor: getLevelAccentForIndex(levelIdx),
    xpInLevel,
    xpToNextLevel,
    progress,
    totalXp,
  };
}

/**
 * Progress ring 0–1 across the full level ladder (levels 1..SCAVENGER_LEVEL_COUNT),
 * not just XP within the current level band.
 */
export function getOverallLevelRingProgress(info: LevelInfo): number {
  const max = SCAVENGER_LEVEL_COUNT;
  if (max <= 1) return 1;
  if (info.level >= max) return 1;
  return Math.min(1, (info.level - 1 + info.progress) / (max - 1));
}

/** Ladder rows for UI (global thresholds). */
export function getScavengerLevelRows(): {
  level: number;
  title: string;
  minXp: number;
  accentColor: string;
}[] {
  return LEVEL_THRESHOLDS.map((minXp, i) => ({
    level: i + 1,
    title: LEVEL_CLASS_TITLES[i] ?? `Level ${i + 1}`,
    minXp,
    accentColor: getLevelAccentForIndex(i),
  }));
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

/** Extra multiplier on base XP when on-time and actual distance ≥ 130% of target. */
export const OVERDISTANCE_XP_BONUS_MULTIPLIER = 1.3;

/** Actual/target distance must be ≥ this to earn {@link OVERDISTANCE_XP_BONUS_MULTIPLIER}. */
export const OVERDISTANCE_RATIO_THRESHOLD = 1.3;

/** Fraction of base mission XP when distance is met after target time (partial completion). */
export const LATE_COMPLETION_XP_FRACTION = 0.5;

export function getStreakXpMultiplier(streak: number): number {
  if (streak >= 5) return 1.2;
  if (streak >= 3) return 1.15;
  if (streak >= 2) return 1.1;
  return 1;
}

export function calculateXpEarned(
  missionType: MissionType,
  streak: number,
  completionRatio: number = 1,
  baseXp?: number,
): number {
  const base = baseXp ?? BASE_XP[missionType];
  const ratio = Math.min(Math.max(completionRatio, 0), 1);
  return Math.ceil(base * ratio * getStreakXpMultiplier(streak));
}

export type TimedMissionXpKind = 'on_time' | 'late' | 'incomplete';

/**
 * XP for a mission attempt: on-time base XP, +30% only if actual distance ≥ 130% of target;
 * half for late distance completion; none for incomplete.
 *
 * @param distanceRatioVsTarget actualKm / targetKm (uncapped); used only for on-time overdistance bonus.
 */
export function calculateTimedMissionXp(
  missionType: MissionType,
  streak: number,
  kind: TimedMissionXpKind,
  completionRatio: number = 1,
  distanceRatioVsTarget?: number,
  baseXp?: number,
): number {
  if (kind === 'incomplete') return 0;
  const base = calculateXpEarned(missionType, streak, completionRatio, baseXp);
  if (kind === 'late') {
    return Math.max(1, Math.floor(base * LATE_COMPLETION_XP_FRACTION));
  }
  const over =
    distanceRatioVsTarget != null &&
    distanceRatioVsTarget >= OVERDISTANCE_RATIO_THRESHOLD;
  const mult = over ? OVERDISTANCE_XP_BONUS_MULTIPLIER : 1;
  return Math.max(1, Math.ceil(base * mult));
}

// ─── Level-up check ──────────────────────────────────────────────────────────

export function didLevelUp(xpBefore: number, xpAfter: number): boolean {
  return getLevelInfo(xpBefore).level < getLevelInfo(xpAfter).level;
}

export function getNewLevel(xpAfter: number): number {
  return getLevelInfo(xpAfter).level;
}

/** XP still needed to enter the next level (0 if max level). */
export function getXpRemainingToNextLevel(totalXp: number): number {
  const info = getLevelInfo(totalXp);
  if (info.level >= SCAVENGER_LEVEL_COUNT) return 0;
  const nextMin = LEVEL_THRESHOLDS[info.level];
  if (nextMin == null) return 0;
  return Math.max(0, nextMin - totalXp);
}

// ─── Format helpers ──────────────────────────────────────────────────────────

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km % 1 === 0 ? km : km.toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatXP(xp: number): string {
  return `+${xp} XP`;
}
