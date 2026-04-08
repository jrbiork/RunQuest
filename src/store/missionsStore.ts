import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mission, MissionsState, UserProfile } from '../types';
import {
  generateMissionsFromProfile as buildMissionQueueFromProfile,
  getNextIncompleteMission,
  recomputeMissionStatuses,
} from '../utils/missionGenerator';
import { parseQueueMissionId } from '../utils/missionLookup';
import { setIndexForMissionIndex } from '../constants/missionProgression';
import { getLevelInfo, SCAVENGER_LEVEL_COUNT } from '../utils/xpCalculator';

interface MissionsActions {
  /** Replace mission queue from profile; optional forced ladder level (e.g. next pack after full completion). */
  generateMissionsFromProfile: (
    profile: UserProfile,
    totalXp: number,
    forcedClassLevel?: number,
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

function withRecomputed(
  list: Mission[],
  missionSetClassLevel: number | null,
): Mission[] {
  const cl =
    missionSetClassLevel != null && missionSetClassLevel >= 1
      ? missionSetClassLevel
      : 1;
  return recomputeMissionStatuses(list, cl);
}

export const useMissionsStore = create<MissionsStore>()(
  persist(
    (set, get) => ({
      weekMissions: [],
      missionSetClassLevel: null,

      generateMissionsFromProfile: (
        profile: UserProfile,
        totalXp: number,
        forcedClassLevel?: number,
      ) => {
        const classLevel =
          forcedClassLevel ??
          profile.startingClassLevel ??
          get().missionSetClassLevel ??
          getLevelInfo(totalXp).level;
        const capped = Math.min(SCAVENGER_LEVEL_COUNT, Math.max(1, classLevel));
        const missions = buildMissionQueueFromProfile(profile, capped);
        set({
          weekMissions: missions,
          missionSetClassLevel: capped,
        });
      },

      completeMission: (missionId: string, xpEarned?: number) => {
        set((state) => {
          const mapped = state.weekMissions.map((m) =>
            m.id === missionId
              ? {
                  ...m,
                  status: 'completed' as const,
                  ...(xpEarned !== undefined ? { xpReward: xpEarned } : {}),
                }
              : m,
          );
          const cl = state.missionSetClassLevel ?? 1;
          return {
            weekMissions: withRecomputed(mapped, cl),
          };
        });
      },

      abortMission: (missionId: string) => {
        set((state) => {
          const mapped = state.weekMissions.map((m) =>
            m.id === missionId ? { ...m, status: 'aborted' as const } : m,
          );
          const cl = state.missionSetClassLevel ?? 1;
          return { weekMissions: withRecomputed(mapped, cl) };
        });
      },

      retryMission: (missionId: string) => {
        set((state) => {
          const mapped = state.weekMissions.map((m) =>
            m.id === missionId && m.status === 'aborted'
              ? { ...m, status: 'active' as const }
              : m,
          );
          const cl = state.missionSetClassLevel ?? 1;
          return { weekMissions: withRecomputed(mapped, cl) };
        });
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
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as {
          weekMissions?: Mission[];
          campaignMissions?: Mission[];
          missionSetClassLevel?: number | null;
        };
        const raw =
          s.campaignMissions && s.campaignMissions.length > 0
            ? s.campaignMissions
            : s.weekMissions ?? [];
        let normalized = normalizeMissionStatuses(raw) as Mission[];
        let missionSetClassLevel = s.missionSetClassLevel ?? null;

        if (version < 3 && normalized.length > 0) {
          const inferred =
            parseQueueMissionId(normalized[0]!.id)?.classLevel ??
            missionSetClassLevel ??
            1;
          if (missionSetClassLevel == null) missionSetClassLevel = inferred;
          normalized = normalized.map((m, idx) => {
            const p = parseQueueMissionId(m.id);
            const cl = p?.classLevel ?? inferred;
            const i = p?.index ?? idx;
            return {
              ...m,
              setIndex: setIndexForMissionIndex(cl, i),
            };
          });
          normalized = withRecomputed(normalized, missionSetClassLevel);
        }

        return {
          weekMissions: normalized,
          missionSetClassLevel,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state?.weekMissions?.length) return;
        const cl = state.missionSetClassLevel ?? 1;
        useMissionsStore.setState({
          weekMissions: recomputeMissionStatuses(state.weekMissions, cl),
        });
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
