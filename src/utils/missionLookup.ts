import type { Mission, PersonaId } from '../types';
import { PERSONA_CAMPAIGNS } from '../constants/campaigns';
import { FUN_RUN_ID, FUN_RUN_MISSION } from '../constants/missions';
import { stripEmojis } from './stripEmojis';

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

const CAMPAIGN_MISSION_ID_RE = /^campaign-(\d+)-day-(\d+)$/;

/**
 * Title from campaign template by stable id (`campaign-{n}-day-{k}`), for history rows
 * when the live mission list no longer contains that id.
 */
export function titleForCampaignMissionId(
  missionId: string,
  personaId: PersonaId | null | undefined,
): string | null {
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION.title;
  const match = missionId.match(CAMPAIGN_MISSION_ID_RE);
  if (!match || !personaId) return null;
  const campaignIndex = Number(match[1]);
  const dayIdx = Number(match[2]);
  const campaigns = PERSONA_CAMPAIGNS[personaId];
  if (!campaigns) return null;
  const campaign = campaigns[campaignIndex];
  if (!campaign) return null;
  const templates = campaign.missionTemplates;
  if (templates.length === 0) return null;
  const template = templates[dayIdx % templates.length];
  return template?.title ?? null;
}

/** Prefer live mission copy; fall back to campaign template / free-run title; last resort id. */
export function resolveMissionDisplayTitle(
  missionId: string,
  mission: Mission | undefined,
  personaId: PersonaId | null | undefined,
): string {
  const fromLive = mission?.title != null ? stripEmojis(mission.title).trim() : '';
  if (fromLive) return fromLive;
  const fromTemplate = titleForCampaignMissionId(missionId, personaId);
  if (fromTemplate) return stripEmojis(fromTemplate).trim();
  return missionId;
}
