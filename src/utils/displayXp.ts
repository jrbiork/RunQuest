import type { CompletedRun } from '../types';

/**
 * Single source of truth for XP shown in UI — reconciles persisted store vs run history.
 */
export function getDisplayXpTotal(params: {
  xp: number;
  runHistory: CompletedRun[];
}): number {
  const xpFromRunHistory = params.runHistory.reduce((sum, r) => sum + r.xpEarned, 0);
  return Math.max(params.xp, xpFromRunHistory);
}
