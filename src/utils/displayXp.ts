import type { CompletedRun, PersonaId } from '../types';
import { getXpForCompletedCampaigns } from '../constants/campaigns';

/**
 * Single source of truth for “XP” shown in UI (home, profile, campaign card).
 * Reconciles persisted store, run history, and campaign template totals when saves drift.
 */
export function getDisplayXpTotal(params: {
  xp: number;
  runHistory: CompletedRun[];
  personaId: PersonaId | null | undefined;
  totalCampaignsCompleted: number;
  currentCampaignIndex: number;
}): number {
  const {
    xp,
    runHistory,
    personaId,
    totalCampaignsCompleted,
    currentCampaignIndex,
  } = params;

  const xpFromRunHistory = runHistory.reduce((sum, r) => sum + r.xpEarned, 0);
  const campaignsCompletedDisplay = Math.max(
    totalCampaignsCompleted,
    currentCampaignIndex,
  );
  const xpFromCompletedCampaignTemplates =
    personaId && campaignsCompletedDisplay > 0
      ? getXpForCompletedCampaigns(personaId, campaignsCompletedDisplay)
      : 0;

  return Math.max(xp, xpFromRunHistory, xpFromCompletedCampaignTemplates);
}
