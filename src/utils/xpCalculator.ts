import type { MissionType, LevelInfo } from '../types';

// ─── Base XP Per Mission Type ─────────────────────────────────────────────────

export const BASE_XP: Record<MissionType, number> = {
  easy: 50,
  recovery: 40,
  tempo: 75,
  interval: 80,
  long: 100,
};

// ─── Level Thresholds ─────────────────────────────────────────────────────────

// XP required to REACH each level (cumulative)
// Designed so early levels are fast, later levels require sustained effort
const LEVEL_THRESHOLDS = [
  0,     // Level 1
  150,   // Level 2
  350,   // Level 3
  650,   // Level 4
  1050,  // Level 5
  1550,  // Level 6
  2200,  // Level 7
  3000,  // Level 8
  4000,  // Level 9
  5250,  // Level 10
  6750,  // Level 11
  8500,  // Level 12
  10500, // Level 13
  12800, // Level 14
  15400, // Level 15 (max displayed)
];

const LEVEL_TITLES = [
  'Rookie Runner',
  'Pavement Pounder',
  'Trail Blazer',
  'Momentum Builder',
  'Endurance Seeker',
  'Distance Chaser',
  'Speed Demon',
  'Race Ready',
  'Iron Legs',
  'Ultramarathoner',
  'Running Legend',
  'Elite Pacer',
  'Marathon Master',
  'Unstoppable',
  'RunQuest Champion',
];

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
  const progress = Math.min(xpInLevel / xpToNextLevel, 1);

  return {
    level,
    title: LEVEL_TITLES[levelIdx] ?? 'RunQuest Champion',
    xpInLevel,
    xpToNextLevel,
    progress,
    totalXp,
  };
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

export function calculateXpEarned(
  missionType: MissionType,
  streak: number,
  completionRatio: number = 1,
): number {
  const base = BASE_XP[missionType];
  // Proportional to distance actually run (capped at 1.0 — no bonus for going over)
  const ratio = Math.min(Math.max(completionRatio, 0), 1);
  // Streak multiplier: +5% per streak day, capped at 1.5x
  const streakMultiplier = Math.min(1 + streak * 0.05, 1.5);
  return Math.ceil(base * ratio * streakMultiplier);
}

// Weekly completion bonus XP
export const WEEKLY_BONUS_XP = 150;

// ─── Level-up check ──────────────────────────────────────────────────────────

export function didLevelUp(xpBefore: number, xpAfter: number): boolean {
  return getLevelInfo(xpBefore).level < getLevelInfo(xpAfter).level;
}

export function getNewLevel(xpAfter: number): number {
  return getLevelInfo(xpAfter).level;
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
