import type { MissionType, LevelInfo } from '../types';

// ─── Base XP Per Mission Type ─────────────────────────────────────────────────

export const BASE_XP: Record<MissionType, number> = {
  easy: 50,
  recovery: 40,
  tempo: 75,
  interval: 80,
  long: 100,
};

// ─── Level Thresholds (cumulative XP to reach each class rank) ───────────────

const LEVEL_THRESHOLDS = [
  0,
  150,
  350,
  650,
  1050,
  1550,
  2200,
  3000,
  4000,
  5250,
  6750,
  8500,
  10500,
  12800,
  15400,
];

/** Number of class ranks (1 … MAX inclusive). */
export const SCAVENGER_LEVEL_COUNT = LEVEL_THRESHOLDS.length;

/** Display names — class ladder (15 ranks). */
export const LEVEL_CLASS_TITLES = [
  'Recruit',
  'Runner',
  'Strider',
  'Pacer',
  'Scout',
  'Pathfinder',
  'Ranger',
  'Striker',
  'Operative',
  'Sentinel',
  'Elite',
  'Vanguard',
  'Apex',
  'Legend',
  'Sovereign',
] as const;

/** Primary accent per class rank (hex), aligned with LEVEL_THRESHOLDS indices. */
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
  '#84CC16',
  '#10B981',
  '#FBBF24',
] as const;

export function getLevelAccentForIndex(levelIndex0: number): string {
  return LEVEL_CLASS_ACCENTS[levelIndex0] ?? LEVEL_CLASS_ACCENTS[LEVEL_CLASS_ACCENTS.length - 1]!;
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
  const xpAtNextLevel = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] ?? 15400;

  const xpInLevel = totalXp - xpAtLevelStart;
  const xpToNextLevel = xpAtNextLevel - xpAtLevelStart;
  const isMaxLevel = level >= SCAVENGER_LEVEL_COUNT;
  const progress =
    isMaxLevel || xpToNextLevel <= 0
      ? 1
      : Math.min(xpInLevel / xpToNextLevel, 1);

  return {
    level,
    title: LEVEL_CLASS_TITLES[levelIdx] ?? 'Sovereign',
    accentColor: getLevelAccentForIndex(levelIdx),
    xpInLevel,
    xpToNextLevel,
    progress,
    totalXp,
  };
}

/**
 * Progress ring 0–1 across the full class ladder (ranks 1..SCAVENGER_LEVEL_COUNT),
 * not just XP within the current rank.
 */
export function getOverallLevelRingProgress(info: LevelInfo): number {
  const max = SCAVENGER_LEVEL_COUNT;
  if (max <= 1) return 1;
  if (info.level >= max) return 1;
  return Math.min(1, (info.level - 1 + info.progress) / (max - 1));
}

/** Ladder rows for UI (global thresholds). */
export function getScavengerLevelRows(): { level: number; title: string; minXp: number; accentColor: string }[] {
  return LEVEL_THRESHOLDS.map((minXp, i) => ({
    level: i + 1,
    title: LEVEL_CLASS_TITLES[i] ?? `Rank ${i + 1}`,
    minXp,
    accentColor: getLevelAccentForIndex(i),
  }));
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

/** Multiplier applied to base mission XP when distance is met at or under target time. */
export const ON_TIME_XP_MULTIPLIER = 1.25;

/** Fraction of base mission XP when distance is met after target time (partial completion). */
export const LATE_COMPLETION_XP_FRACTION = 0.5;

export function calculateXpEarned(
  missionType: MissionType,
  _streak: number,
  completionRatio: number = 1,
): number {
  const base = BASE_XP[missionType];
  const ratio = Math.min(Math.max(completionRatio, 0), 1);
  return Math.ceil(base * ratio);
}

export type TimedMissionXpKind = 'on_time' | 'late' | 'incomplete';

/**
 * XP for a mission attempt: on-time bonus, half for late distance completion, none for incomplete.
 */
export function calculateTimedMissionXp(
  missionType: MissionType,
  streak: number,
  kind: TimedMissionXpKind,
  completionRatio: number = 1,
): number {
  if (kind === 'incomplete') return 0;
  const base = calculateXpEarned(missionType, streak, completionRatio);
  if (kind === 'late') {
    return Math.max(1, Math.floor(base * LATE_COMPLETION_XP_FRACTION));
  }
  return Math.max(1, Math.ceil(base * ON_TIME_XP_MULTIPLIER));
}

// ─── Level-up check ──────────────────────────────────────────────────────────

export function didLevelUp(xpBefore: number, xpAfter: number): boolean {
  return getLevelInfo(xpBefore).level < getLevelInfo(xpAfter).level;
}

export function getNewLevel(xpAfter: number): number {
  return getLevelInfo(xpAfter).level;
}

/** XP still needed to enter the next class rank (0 if max rank). */
export function getXpRemainingToNextClass(totalXp: number): number {
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
