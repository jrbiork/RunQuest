import type { DayOfWeek, Mission, MissionType, PersonaId } from '../types';
import {
  FUN_RUN_ID,
  FUN_RUN_MISSION,
  missionCopyForQueueIndex,
} from '../constants/missions';
import { setIndexForMissionIndex } from '../constants/missionProgression';
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

/**
 * Resolve mission metadata for stats/history when `weekMissions` no longer contains
 * the id (queue regenerated after level-up). Parses stored queue ids.
 */
export function resolveMissionForHistory(
  missionId: string,
  weekMissions: Mission[],
  _personaId: PersonaId | null | undefined,
): Mission | undefined {
  const live = findMissionById(weekMissions, missionId);
  if (live) return live;
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION;

  const queueParsed = parseQueueMissionId(missionId);
  if (queueParsed) {
    const t = getMissionTargetsForClassLevel(
      queueParsed.type,
      queueParsed.classLevel,
      queueParsed.index,
    );
    const copy = missionCopyForQueueIndex(queueParsed.index);
    return {
      id: missionId,
      type: queueParsed.type,
      title: stripEmojis(copy.title),
      subtitle: stripEmojis(copy.subtitle),
      description: stripEmojis(copy.description),
      targetDistanceKm: t.distanceKm,
      targetDurationMin: t.durationMin,
      targetCyclingDistanceKm: t.cyclingDistanceKm,
      targetCyclingDurationMin: t.cyclingDurationMin,
      xpReward: BASE_XP[queueParsed.type],
      day: 'Mon' as DayOfWeek,
      scheduledDate: queueParsed.scheduledDate,
      status: 'completed',
      setIndex: setIndexForMissionIndex(
        queueParsed.classLevel,
        queueParsed.index,
      ),
    };
  }

  return undefined;
}

/** Prefer live mission copy; fall back to free-run title; last resort id. */
export function resolveMissionDisplayTitle(
  missionId: string,
  mission: Mission | undefined,
  _personaId: PersonaId | null | undefined,
): string {
  const fromLive = mission?.title != null ? stripEmojis(mission.title).trim() : '';
  if (fromLive) return fromLive;
  if (missionId === FUN_RUN_ID) return FUN_RUN_MISSION.title;
  return missionId;
}
