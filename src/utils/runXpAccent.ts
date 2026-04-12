import type { CompletedRun } from '../types';
import { getDisplayXpTotal } from './displayXp';
import {
  getDisplayXpWithStartingLevelOffset,
  getLevelInfo,
} from './xpCalculator';

export function runHistoryEntryKey(r: CompletedRun): string {
  return `${r.missionId}\t${r.completedAt}`;
}

/**
 * Snapshot accent for a new history row (same rules as home level badge).
 */
export function snapshotXpTagAccentColor(params: {
  totalXpAfterRun: number;
  runHistoryIncludingThisRun: CompletedRun[];
  startingClassLevel?: number;
}): string {
  const displayXpTotal = getDisplayXpTotal({
    xp: params.totalXpAfterRun,
    runHistory: params.runHistoryIncludingThisRun,
  });
  const displayLevelXp = getDisplayXpWithStartingLevelOffset(
    displayXpTotal,
    params.startingClassLevel,
  );
  return getLevelInfo(displayLevelXp).accentColor;
}

/**
 * Map each run to its +XP tag accent: stored snapshot when present, else inferred from
 * chronological cumulative XP (legacy / missing field).
 */
export function buildXpTagAccentByRunKey(
  runHistory: CompletedRun[],
  startingClassLevel?: number,
): Map<string, string> {
  const sorted = [...runHistory].sort((a, b) => {
    const t = a.completedAt.localeCompare(b.completedAt);
    if (t !== 0) return t;
    return a.missionId.localeCompare(b.missionId);
  });
  const map = new Map<string, string>();
  let cum = 0;
  for (const r of sorted) {
    cum += r.xpEarned;
    const accent =
      r.xpTagAccentColor ??
      getLevelInfo(
        getDisplayXpWithStartingLevelOffset(cum, startingClassLevel),
      ).accentColor;
    map.set(runHistoryEntryKey(r), accent);
  }
  return map;
}

/** One-time persist migration: freeze +XP accents for runs that predate `xpTagAccentColor`. */
export function migrateRunHistoryXpTagAccents(
  runs: CompletedRun[],
  startingClassLevel?: number,
): CompletedRun[] {
  if (runs.length === 0) return runs;
  const sorted = [...runs].sort((a, b) => {
    const t = a.completedAt.localeCompare(b.completedAt);
    if (t !== 0) return t;
    return a.missionId.localeCompare(b.missionId);
  });
  const keyToAccent = new Map<string, string>();
  let cum = 0;
  for (const r of sorted) {
    cum += r.xpEarned;
    keyToAccent.set(
      runHistoryEntryKey(r),
      r.xpTagAccentColor ??
        getLevelInfo(
          getDisplayXpWithStartingLevelOffset(cum, startingClassLevel),
        ).accentColor,
    );
  }
  return runs.map((r) =>
    r.xpTagAccentColor != null && r.xpTagAccentColor !== ''
      ? r
      : { ...r, xpTagAccentColor: keyToAccent.get(runHistoryEntryKey(r))! },
  );
}
