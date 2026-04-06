import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDateOffsetMs } from '../utils/dateUtils';
import type { UserProfile } from '../types';
import { getNextIncompleteMission } from '../utils/missionGenerator';
import { calculateTimedMissionXp } from '../utils/xpCalculator';
import { MIN_EFFORT_SECONDS, useUserStore } from './userStore';
import { useMissionsStore } from './missionsStore';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DevStore {
  dayOffset: number;
  adjustDay: (delta: number) => void;
  resetDateOffset: () => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      dayOffset: 0,

      adjustDay: (delta: number) => {
        const next = get().dayOffset + delta;
        setDateOffsetMs(next * MS_PER_DAY);
        set({ dayOffset: next });
      },

      resetDateOffset: () => {
        setDateOffsetMs(0);
        set({ dayOffset: 0 });
      },
    }),
    {
      name: 'runquest-dev',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.dayOffset !== 0) {
          setDateOffsetMs(state.dayOffset * MS_PER_DAY);
        }
      },
    },
  ),
);

export function getMockedDateLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Today (real)';
  const d = new Date(Date.now() + dayOffset * MS_PER_DAY);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${label} (${dayOffset > 0 ? '+' : ''}${dayOffset}d)`;
}

export type DevCompleteMissionsResult = {
  completed: number;
  requested: number;
};

/**
 * Marks up to `count` current journey missions as completed and logs successful runs (on-time XP).
 */
export function devCompleteSuccessfulMissions(
  profile: UserProfile,
  count: number,
): DevCompleteMissionsResult {
  const requested = count;
  if (count <= 0) return { completed: 0, requested };

  const activityMode = profile.defaultActivityMode ?? 'run';
  const completeMission = useMissionsStore.getState().completeMission;
  const completeRun = useUserStore.getState().completeRun;
  const regenerateMissionsIfPromoted = useMissionsStore.getState().regenerateMissionsIfPromoted;

  let completed = 0;
  for (let i = 0; i < count; i++) {
    const list = useMissionsStore.getState().weekMissions;
    const next = getNextIncompleteMission(list);
    if (!next) break;

    const distKm =
      activityMode === 'cycle'
        ? next.targetCyclingDistanceKm
        : next.targetDistanceKm;
    const durMin =
      activityMode === 'cycle'
        ? next.targetCyclingDurationMin
        : next.targetDurationMin;

    const streak = useUserStore.getState().streak;
    const xpEarned = calculateTimedMissionXp(next.type, streak, 'on_time');
    const xpBefore = useUserStore.getState().xp;

    completeMission(next.id, xpEarned);
    completeRun(
      next.id,
      next.type,
      distKm,
      durMin,
      undefined,
      true,
      activityMode,
      MIN_EFFORT_SECONDS,
      { onTime: true, targetDistanceKm: distKm },
    );

    const xpAfter = useUserStore.getState().xp;
    const p = useUserStore.getState().profile ?? profile;
    regenerateMissionsIfPromoted(p, xpBefore, xpAfter);
    completed += 1;
  }

  return { completed, requested };
}
