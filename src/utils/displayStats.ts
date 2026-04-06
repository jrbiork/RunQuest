import type { ActivityMode, CompletedRun } from '../types';
import { isMissionCompletedOrPartial } from './runOutcome';

/** Reconciles persisted totals with run history for profile / stats UI. */
export function getDisplayOverallStats(params: {
  totalDistanceKm: number;
  runHistory: CompletedRun[];
  activityMode: ActivityMode;
}): {
  missions: number;
  attempts: number;
  distanceKm: number;
} {
  const { totalDistanceKm, runHistory } = params;

  const fromHistoryDistance = runHistory.reduce((sum, r) => sum + r.distanceKm, 0);
  const missions = runHistory.filter(isMissionCompletedOrPartial).length;

  return {
    missions,
    attempts: runHistory.length,
    distanceKm: Math.max(totalDistanceKm, fromHistoryDistance),
  };
}
