import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mission, MissionsState, UserProfile } from '../types';
import { generateWeekMissions, getTodaysMission } from '../utils/missionGenerator';
import { getWeekStartISO, isNewWeek } from '../utils/dateUtils';

interface MissionsActions {
  generateWeek: (profile: UserProfile) => void;
  completeMission: (missionId: string) => void;
  refreshIfNewWeek: (profile: UserProfile) => void;
}

type MissionsStore = MissionsState & MissionsActions;

export const useMissionsStore = create<MissionsStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ────────────────────────────────────────────────
      weekMissions: [],
      weekStartDate: null,

      // ─── Actions ──────────────────────────────────────────────────────

      generateWeek: (profile: UserProfile) => {
        const missions = generateWeekMissions(profile);
        set({
          weekMissions: missions,
          weekStartDate: getWeekStartISO(),
        });
      },

      completeMission: (missionId: string) => {
        set((state) => ({
          weekMissions: state.weekMissions.map((m) =>
            m.id === missionId ? { ...m, status: 'completed' } : m,
          ),
        }));
      },

      refreshIfNewWeek: (profile: UserProfile) => {
        const state = get();
        if (isNewWeek(state.weekStartDate) || state.weekMissions.length === 0) {
          const missions = generateWeekMissions(profile);
          set({
            weekMissions: missions,
            weekStartDate: getWeekStartISO(),
          });
        }
      },
    }),
    {
      name: 'runquest-missions',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

export const selectTodaysMission = (state: MissionsStore): Mission | null =>
  getTodaysMission(state.weekMissions);

export const selectCompletedCount = (state: MissionsStore): number =>
  state.weekMissions.filter((m) => m.status === 'completed').length;

export const selectAllComplete = (state: MissionsStore): boolean =>
  state.weekMissions.length > 0 &&
  state.weekMissions.every((m) => m.status === 'completed');

export const selectNextMission = (state: MissionsStore): import('../types').Mission | null =>
  state.weekMissions.find((m) => m.status !== 'completed') ?? null;
