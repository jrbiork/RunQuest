import type { ActivityMode, CompletedRun } from '../types';

/** Reconciles persisted totals with run history for profile / stats UI. */
export function getDisplayOverallStats(params: {
  totalRuns: number;
  totalDistanceKm: number;
  runHistory: CompletedRun[];
  activityMode: ActivityMode;
}): {
  sorties: number;
  distanceKm: number;
  missionsCompleted: number;
} {
  const { totalRuns, totalDistanceKm, runHistory } = params;

  const fromHistoryRuns = runHistory.length;
  const fromHistoryDistance = runHistory.reduce((sum, r) => sum + r.distanceKm, 0);
  const fromHistoryGoalMet = runHistory.filter((r) => r.goalMet).length;

  return {
    sorties: Math.max(totalRuns, fromHistoryRuns),
    distanceKm: Math.max(totalDistanceKm, fromHistoryDistance),
    missionsCompleted: fromHistoryGoalMet,
  };
}
