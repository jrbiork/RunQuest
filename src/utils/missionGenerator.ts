import type {
  UserProfile,
  Mission,
  MissionType,
  DayOfWeek,
  ExperienceLevel,
  RunningGoal,
} from '../types';
import { MISSION_TEMPLATES } from '../constants/missions';
import { BASE_XP } from './xpCalculator';
import {
  getScheduledDatesForWeek,
  getWeekStart,
  getTodayISO,
  getNow,
} from './dateUtils';

// ─── Mission Mix Rules ────────────────────────────────────────────────────────

type MissionMix = MissionType[];

function getMissionMix(
  level: ExperienceLevel,
  goal: RunningGoal,
  runsPerWeek: number,
): MissionMix {
  // Base mixes by experience
  const mixes: Record<ExperienceLevel, Record<number, MissionMix>> = {
    beginner: {
      1: ['easy'],
      2: ['easy', 'easy'],
      3: ['easy', 'recovery', 'easy'],
      4: ['easy', 'recovery', 'easy', 'easy'],
      5: ['easy', 'easy', 'recovery', 'easy', 'easy'],
    },
    intermediate: {
      1: ['easy'],
      2: ['easy', 'tempo'],
      3: ['easy', 'tempo', 'easy'],
      4: ['easy', 'tempo', 'recovery', 'easy'],
      5: ['easy', 'tempo', 'interval', 'recovery', 'easy'],
    },
    advanced: {
      1: ['tempo'],
      2: ['tempo', 'easy'],
      3: ['tempo', 'interval', 'easy'],
      4: ['tempo', 'interval', 'easy', 'long'],
      5: ['long', 'tempo', 'interval', 'easy', 'recovery'],
    },
  };

  const baseMix = mixes[level][runsPerWeek] ??
    mixes[level][3] ?? ['easy', 'recovery', 'easy'];

  // Adjust for specific goals
  if (goal === 'race' || goal === 'distance') {
    // Swap one 'easy' for 'long' if not already present and runs >= 3
    if (!baseMix.includes('long') && runsPerWeek >= 3) {
      const easyIdx = baseMix.lastIndexOf('easy');
      if (easyIdx !== -1) {
        const result = [...baseMix];
        result[easyIdx] = 'long';
        return result as MissionMix;
      }
    }
  }

  if (goal === 'speed') {
    // Add interval if not present
    if (!baseMix.includes('interval') && runsPerWeek >= 3) {
      const result = [...baseMix];
      const easyIdx = result.indexOf('easy');
      if (easyIdx !== -1) result[easyIdx] = 'interval';
      return result as MissionMix;
    }
  }

  if (goal === 'habit' || goal === 'consistency') {
    // Keep it easy and achievable
    return baseMix.map((t) => (t === 'interval' ? 'easy' : t)) as MissionMix;
  }

  return baseMix;
}

// ─── Target distance / duration per mission type ─────────────────────────────

interface MissionTargets {
  distanceKm: number;
  durationMin: number;
  cyclingDistanceKm: number;
  cyclingDurationMin: number;
}

function getTargets(type: MissionType, level: ExperienceLevel): MissionTargets {
  // Running targets (kept at 1km/5min for easy testing)
  const runTargets: Record<ExperienceLevel, Record<MissionType, { distanceKm: number; durationMin: number }>> = {
    beginner: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
    intermediate: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
    advanced: {
      easy:     { distanceKm: 1, durationMin: 5 },
      recovery: { distanceKm: 1, durationMin: 5 },
      tempo:    { distanceKm: 1, durationMin: 5 },
      interval: { distanceKm: 1, durationMin: 5 },
      long:     { distanceKm: 1, durationMin: 5 },
    },
  };
  const run = runTargets[level][type]!;
  return {
    distanceKm: run.distanceKm,
    durationMin: run.durationMin,
    // Cycling covers ~2.5× the distance in the same time
    cyclingDistanceKm: Math.round(run.distanceKm * 2.5 * 10) / 10,
    cyclingDurationMin: run.durationMin,
  };
}

// ─── Pick a random item from an array ────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ─── Build a single Mission object ───────────────────────────────────────────

function buildMission(
  type: MissionType,
  day: DayOfWeek,
  scheduledDate: string,
  level: ExperienceLevel,
  index: number,
  todayISO: string,
): Mission {
  const template = MISSION_TEMPLATES[type];
  const targets = getTargets(type, level);

  let status: Mission['status'];
  if (scheduledDate < todayISO) {
    status = 'upcoming'; // past but not completed yet — shown as available
  } else if (scheduledDate === todayISO) {
    status = 'active';
  } else if (index === 0) {
    status = 'active';
  } else {
    status = 'upcoming';
  }

  return {
    id: `mission-${scheduledDate}-${type}-${index}`,
    type,
    title: pick(template.titles),
    subtitle: pick(template.subtitles),
    description: pick(template.descriptions),
    targetDistanceKm: targets.distanceKm,
    targetDurationMin: targets.durationMin,
    targetCyclingDistanceKm: targets.cyclingDistanceKm,
    targetCyclingDurationMin: targets.cyclingDurationMin,
    xpReward: BASE_XP[type],
    day,
    scheduledDate,
    status,
  };
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateWeekMissions(profile: UserProfile): Mission[] {
  const {
    experienceLevel,
    runningGoal,
    weeklyTargetMode,
    weeklyTargetRuns,
    preferredDays,
  } = profile;

  const runsPerWeek =
    weeklyTargetMode === 'runs'
      ? Math.min(weeklyTargetRuns, preferredDays.length)
      : Math.min(3, preferredDays.length); // default 3 if distance-based

  // Trim days to the target run count (take first N preferred days)
  const activeDays = preferredDays.slice(0, runsPerWeek);
  const weekStart = getWeekStart(getNow());
  const scheduledDates = getScheduledDatesForWeek(activeDays, weekStart);
  const missionMix = getMissionMix(experienceLevel, runningGoal, runsPerWeek);
  const today = getTodayISO();

  return missionMix.map((type, idx) => {
    const date = scheduledDates[idx] ?? scheduledDates[0] ?? today;
    const day = activeDays[idx] ?? activeDays[0] ?? 'Mon';
    return buildMission(type, day, date, experienceLevel, idx, today);
  });
}

// ─── Derive today's mission from the week list ────────────────────────────────

export function getTodaysMission(missions: Mission[]): Mission | null {
  const today = getTodayISO();
  // Prefer exact date match
  const exact = missions.find(
    (m) => m.scheduledDate === today && m.status !== 'completed',
  );
  if (exact) return exact;
  // Next incomplete upcoming
  const upcoming = missions.find(
    (m) => m.status !== 'completed' && m.scheduledDate >= today,
  );
  return upcoming ?? null;
}

export function getNextMission(
  missions: Mission[],
  afterId: string,
): Mission | null {
  const idx = missions.findIndex((m) => m.id === afterId);
  if (idx === -1) return null;
  return missions.slice(idx + 1).find((m) => m.status !== 'completed') ?? null;
}
