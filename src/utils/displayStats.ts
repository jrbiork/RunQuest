import type { ActivityMode, CompletedRun, PersonaId } from '../types';
import { getStatsFromCompletedCampaignTemplates } from '../constants/campaigns';

/**
 * Reconciles persisted totals + run history + expected counts from completed campaigns
 * when legacy saves only advanced campaign state.
 */
export function getDisplayOverallStats(params: {
  totalRuns: number;
  totalDistanceKm: number;
  runHistory: CompletedRun[];
  personaId: PersonaId | null | undefined;
  campaignsCompleted: number;
  activityMode: ActivityMode;
}): {
  sorties: number;
  distanceKm: number;
  missionsCompleted: number;
} {
  const {
    totalRuns,
    totalDistanceKm,
    runHistory,
    personaId,
    campaignsCompleted,
    activityMode,
  } = params;

  const fromHistoryRuns = runHistory.length;
  const fromHistoryDistance = runHistory.reduce((sum, r) => sum + r.distanceKm, 0);
  const fromHistoryGoalMet = runHistory.filter((r) => r.goalMet).length;

  const template =
    personaId && campaignsCompleted > 0
      ? getStatsFromCompletedCampaignTemplates(personaId, campaignsCompleted, activityMode)
      : { sorties: 0, missionsCompleted: 0, distanceKm: 0 };

  return {
    sorties: Math.max(totalRuns, fromHistoryRuns, template.sorties),
    distanceKm: Math.max(totalDistanceKm, fromHistoryDistance, template.distanceKm),
    missionsCompleted: Math.max(fromHistoryGoalMet, template.missionsCompleted),
  };
}
