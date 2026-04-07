import type {
  CampaignMissionTemplate,
  DayOfWeek,
  Mission,
  MissionType,
  PersonaId,
} from '../types';
import { PERSONA_CAMPAIGNS } from '../constants/campaigns';
import {
  FUN_RUN_ID,
  FUN_RUN_MISSION,
  MISSION_TEMPLATES,
} from '../constants/missions';
import { getMissionTargetsForClassLevel } from './missionGenerator';
import { BASE_XP } from './xpCalculator';
import { stripEmojis } from './stripEmojis';

/** Expo Router may pass dynamic segments as string | string[] */
export function normalizeRouteParam(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export function findMissionById(
  missions: Mission[],
  id: string | undefined,
): Mission | undefined {
  if (!id) return undefined;
  return missions.find((m) => m.id === id);
}

const CAMPAIGN_MISSION_ID_RE = /^campaign-(\d+)-day-(\d+)$/;

/** Matches `mission-L{class}-i{idx}-{YYYY-MM-DD}-{type}` from `missionGenerator`. */
const QUEUE_MISSION_ID_RE =
  /^mission-L(\d+)-i(\d+)-(\d{4}-\d{2}-\d{2})-(easy|recovery|tempo|interval|long)$/;

export function parseQueueMissionId(missionId: string): {
  classLevel: number;
  index: number;
  scheduledDate: string;
  type: MissionType;
} | null {
  const m = missionId.match(QUEUE_MISSION_ID_RE);
  if (!m) return null;
  return {
    classLevel: Number(m[1]),
    index: Number(m[2]),
    scheduledDate: m[3]!,
    type: m[4] as MissionType,
  };
}

function getCampaignMissionTemplate(
  missionId: string,
  personaId: PersonaId | null | undefined,
): CampaignMissionTemplate | null {
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
  return templates[dayIdx % templates.length] ?? null;
}

function missionFromCampaignTemplate(
  missionId: string,
  template: CampaignMissionTemplate,
  scheduledDate: string,
): Mission {
  return {
    id: missionId,
    type: template.type,
    title: stripEmojis(template.title),
    subtitle: stripEmojis(template.subtitle),
    description: stripEmojis(template.description ?? ''),
    targetDistanceKm: template.targetDistanceKm,
    targetDurationMin: template.targetDurationMin,
    targetCyclingDistanceKm: template.targetCyclingDistanceKm,
    targetCyclingDurationMin: template.targetCyclingDurationMin,
    xpReward: template.xpReward,
    day: 'Mon' as DayOfWeek,
    scheduledDate,
    status: 'completed',
    ...(template.audioCues ? { audioCues: template.audioCues } : {}),
  };
}

/**
 * Resolve mission metadata for stats/history when `weekMissions` no longer contains
 * the id (queue regenerated after level-up). Parses stored queue ids and campaign ids.
 */
export function resolveMissionForHistory(
  missionId: string,
  weekMissions: Mission[],
  personaId: PersonaId | null | undefined,
): Mission | undefined {
  const live = findMissionById(weekMissions, missionId);
  if (live) return live;
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION;

  const queueParsed = parseQueueMissionId(missionId);
  if (queueParsed) {
    const t = getMissionTargetsForClassLevel(queueParsed.type, queueParsed.classLevel);
    const tmpl = MISSION_TEMPLATES[queueParsed.type];
    return {
      id: missionId,
      type: queueParsed.type,
      title: stripEmojis(tmpl.titles[0] ?? queueParsed.type),
      subtitle: stripEmojis(tmpl.subtitles[0] ?? ''),
      description: stripEmojis(tmpl.descriptions[0] ?? ''),
      targetDistanceKm: t.distanceKm,
      targetDurationMin: t.durationMin,
      targetCyclingDistanceKm: t.cyclingDistanceKm,
      targetCyclingDurationMin: t.cyclingDurationMin,
      xpReward: BASE_XP[queueParsed.type],
      day: 'Mon' as DayOfWeek,
      scheduledDate: queueParsed.scheduledDate,
      status: 'completed',
    };
  }

  const camp = getCampaignMissionTemplate(missionId, personaId);
  if (camp) {
    return missionFromCampaignTemplate(missionId, camp, '1970-01-01');
  }

  return undefined;
}

/**
 * Title from campaign template by stable id (`campaign-{n}-day-{k}`), for history rows
 * when the live mission list no longer contains that id.
 */
export function titleForCampaignMissionId(
  missionId: string,
  personaId: PersonaId | null | undefined,
): string | null {
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION.title;
  const template = getCampaignMissionTemplate(missionId, personaId);
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
