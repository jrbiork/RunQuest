import type { Mission } from '../types';

/** Expo Router may pass dynamic segments as string | string[] */
export function normalizeRouteParam(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

/**
 * Journey uses `campaignMissions` when present; `generateWeek` / `refreshIfNewWeek`
 * only updated `weekMissions`, so IDs can exist in one list but not the other.
 * Always resolve by campaign first (matches Journey), then weekly legacy missions.
 */
export function findMissionById(
  campaignMissions: Mission[],
  weekMissions: Mission[],
  id: string | undefined,
): Mission | undefined {
  if (!id) return undefined;
  return (
    campaignMissions.find((m) => m.id === id) ?? weekMissions.find((m) => m.id === id)
  );
}
