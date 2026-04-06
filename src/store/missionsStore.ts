import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mission, MissionsState, UserProfile } from '../types';
import {
  generateMissionsFromProfile as buildMissionQueueFromProfile,
  getNextIncompleteMission,
} from '../utils/missionGenerator';
import { getLevelInfo } from '../utils/xpCalculator';

interface MissionsActions {
  /** Replace mission queue from profile and current total XP (derives level). */
  generateMissionsFromProfile: (profile: UserProfile, totalXp: number) => void;
  /** After a run, refill missions when the user crossed into a higher level. */
  regenerateMissionsIfPromoted: (
    profile: UserProfile,
    xpBefore: number,
    xpAfter: number,
  ) => void;
  completeMission: (missionId: string, xpEarned?: number) => void;
  abortMission: (missionId: string) => void;
  retryMission: (missionId: string) => void;
  resetMissions: () => void;
}

type MissionsStore = MissionsState & MissionsActions;

function normalizeMissionStatuses(list: Mission[]): Mission[] {
  return list.map((m) =>
    (m.status as string) === 'failed' ? { ...m, status: 'active' as const } : m,
  );
}

export const useMissionsStore = create<MissionsStore>()(
  persist(
    (set, get) => ({
      weekMissions: [],
      missionSetClassLevel: null,

      generateMissionsFromProfile: (profile: UserProfile, totalXp: number) => {
        const classLevel = getLevelInfo(totalXp).level;
        const missions = buildMissionQueueFromProfile(profile, classLevel);
        set({
          weekMissions: missions,
          missionSetClassLevel: classLevel,
        });
      },

      /** If XP crosses at least one level threshold, rebuild the queue for the new level. Multi-level jumps in one run use the final level (one new batch). */
      regenerateMissionsIfPromoted: (profile, xpBefore, xpAfter) => {
        const beforeLv = getLevelInfo(xpBefore).level;
        const afterLv = getLevelInfo(xpAfter).level;
        if (afterLv <= beforeLv) return;
        get().generateMissionsFromProfile(profile, xpAfter);
      },

      completeMission: (missionId: string, xpEarned?: number) => {
        set((state) => ({
          weekMissions: state.weekMissions.map((m) =>
            m.id === missionId
              ? {
                  ...m,
                  status: 'completed' as const,
                  ...(xpEarned !== undefined ? { xpReward: xpEarned } : {}),
                }
              : m,
          ),
        }));
      },

      abortMission: (missionId: string) => {
        set((state) => ({
          weekMissions: state.weekMissions.map((m) =>
            m.id === missionId ? { ...m, status: 'aborted' as const } : m,
          ),
        }));
      },

      retryMission: (missionId: string) => {
        set((state) => ({
          weekMissions: state.weekMissions.map((m) =>
            m.id === missionId && m.status === 'aborted'
              ? { ...m, status: 'active' as const }
              : m,
          ),
        }));
      },

      resetMissions: () => {
        set({
          weekMissions: [],
          missionSetClassLevel: null,
        });
      },
    }),
    {
      name: 'runquest-missions',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: unknown) => {
        const s = persisted as {
          weekMissions?: Mission[];
          campaignMissions?: Mission[];
          missionSetClassLevel?: number | null;
        };
        const raw =
          s.campaignMissions && s.campaignMissions.length > 0
            ? s.campaignMissions
            : s.weekMissions ?? [];
        return {
          weekMissions: normalizeMissionStatuses(raw),
          missionSetClassLevel: s.missionSetClassLevel ?? null,
        };
      },
      partialize: (state) => ({
        weekMissions: state.weekMissions,
        missionSetClassLevel: state.missionSetClassLevel,
      }),
    },
  ),
);

export const selectTodaysMission = (state: MissionsStore): Mission | null =>
  getNextIncompleteMission(state.weekMissions);

export const selectCompletedCount = (state: MissionsStore): number =>
  state.weekMissions.filter((m) => m.status === 'completed').length;

export const selectAllComplete = (state: MissionsStore): boolean =>
  state.weekMissions.length > 0 && state.weekMissions.every((m) => m.status === 'completed');

export const selectNextMission = (state: MissionsStore): Mission | null =>
  getNextIncompleteMission(state.weekMissions);
