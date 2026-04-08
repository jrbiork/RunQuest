import type { ExperienceLevel } from '../types';
import { SCAVENGER_LEVEL_COUNT } from '../utils/xpCalculator';

const BEGINNER_MAX = 8;
const INTERMEDIATE_MAX = 18;
const ADVANCED_MAX = 26;

/** Map game level (1…SCAVENGER_LEVEL_COUNT) to mission tier. */
export function levelTierForClassLevel(classLevel: number): ExperienceLevel {
  const L = Math.max(1, Math.min(SCAVENGER_LEVEL_COUNT, Math.floor(classLevel)));
  if (L <= BEGINNER_MAX) return 'beginner';
  if (L <= INTERMEDIATE_MAX) return 'intermediate';
  if (L <= ADVANCED_MAX) return 'advanced';
  return 'pro';
}

/** Missions per pack: Beginner 6, Intermediate 9, Advanced/Pro 12. */
export function missionCountForClassLevel(classLevel: number): number {
  const t: ExperienceLevel = levelTierForClassLevel(classLevel);
  if (t === 'beginner') return 6;
  if (t === 'intermediate') return 9;
  return 12;
}

/**
 * Start index of each set in the mission list (0-based).
 * Beginner: 2×3 → [0, 3]; Intermediate: 3×3 → [0, 3, 6]; Advanced/Pro: 3×4 → [0, 4, 8].
 */
export function setStartIndicesForClassLevel(classLevel: number): number[] {
  const t = levelTierForClassLevel(classLevel);
  if (t === 'beginner') return [0, 3];
  if (t === 'intermediate') return [0, 3, 6];
  return [0, 4, 8];
}

/** Which set (0-based) mission index `missionIndex` belongs to. */
export function setIndexForMissionIndex(
  classLevel: number,
  missionIndex: number,
): number {
  const starts = setStartIndicesForClassLevel(classLevel);
  let s = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i]! <= missionIndex) s = i;
  }
  return s;
}

/** Inclusive [start, end] index ranges per set. */
export function setRangesForClassLevel(
  classLevel: number,
  missionCount: number,
): [number, number][] {
  const starts = setStartIndicesForClassLevel(classLevel);
  const ranges: [number, number][] = [];
  for (let s = 0; s < starts.length; s++) {
    const start = starts[s]!;
    const end = (starts[s + 1] ?? missionCount) - 1;
    ranges.push([start, Math.min(end, missionCount - 1)]);
  }
  return ranges;
}
