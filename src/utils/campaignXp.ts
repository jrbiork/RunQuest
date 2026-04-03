import type { CompletedRun, Mission } from '../types';

/**
 * XP earned vs total for the current campaign list, matching the Journey card:
 * completed missions use run history XP when available, totals sum template rewards.
 */
export function getCampaignXpEarnedAndTotal(
  campaignMissions: Mission[],
  runHistory: CompletedRun[],
): { campaignXpEarned: number; campaignXpTotal: number } {
  const sorted = [...runHistory].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  const earnedByMission = new Map<string, number>();
  for (const run of sorted) {
    earnedByMission.set(run.missionId, run.xpEarned);
  }
  let earned = 0;
  let total = 0;
  for (const m of campaignMissions) {
    const actual =
      m.status === 'completed'
        ? (earnedByMission.get(m.id) ?? m.xpReward)
        : m.xpReward;
    if (m.status === 'completed') earned += actual;
    total += actual;
  }
  return { campaignXpEarned: earned, campaignXpTotal: total };
}
