import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ExperienceLevel,
  UserProfile,
  UserState,
  CompletedRun,
  GpsPoint,
  MissionOutcome,
} from '../types';
import {
  calculateTimedMissionXp,
  getLevelInfo,
  type TimedMissionXpKind,
} from '../utils/xpCalculator';
import { levelTierForClassLevel } from '../constants/missionProgression';
import { RECRUIT_TARGET_DISTANCES_KM } from '../utils/missionGenerator';
import { setAudioMutedFlag, syncOnboardingAmbientWithMute } from '../services/audioService';
import { getTodayISO, getNowISOString, isStreakAlive } from '../utils/dateUtils';
import type { MissionType } from '../types';

/** Minimum moving time (seconds) for effort-based credit when the mission goal is not met. */
export const MIN_EFFORT_SECONDS = 5 * 60;

export type CompleteRunOptions = {
  /** When distance target was met, whether it was at or under target time. False = partial completion (half XP). */
  onTime?: boolean;
  /** Mission target distance for run vs cycle; used for overdistance XP bonus. */
  targetDistanceKm?: number;
  /** Per-mission base XP from generator (level band distribution). */
  missionBaseXp?: number;
};

interface UserActions {
  completeOnboarding: (profile: UserProfile) => void;
  markIntroSeen: () => void;
  markIosAlwaysLocationPromptCompleted: () => void;
  setAudioMuted: (muted: boolean) => void;
  completeRun: (
    missionId: string,
    missionType: MissionType,
    actualDistanceKm?: number,
    actualDurationMin?: number,
    path?: GpsPoint[],
    /** True when target distance was reached (even if over time). */
    distanceGoalMet?: boolean,
    activityMode?: import('../types').ActivityMode,
    elapsedSec?: number,
    runOptions?: CompleteRunOptions,
  ) => CompletedRun;
  appendRunHistoryEntry: (run: CompletedRun) => void;
  recordStreakOnMissionStart: () => void;
  recordEffortFromElapsedSec: (elapsedSec: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
}

type UserStore = UserState & UserActions;

/** Avoid regressing session updates if rehydration finishes after an in-memory write (default merge prefers persisted keys). */
function mergeUserPersist(
  persistedState: unknown,
  currentState: UserStore,
): UserStore {
  const p = persistedState as Partial<UserState> | undefined;
  const merged: UserStore = {
    ...currentState,
    ...(p ?? {}),
  };
  merged.streak = Math.max(currentState.streak, p?.streak ?? 0);
  merged.longestStreak = Math.max(
    currentState.longestStreak,
    p?.longestStreak ?? 0,
  );
  const cDate = currentState.lastRunDate;
  const pDate = p?.lastRunDate ?? null;
  merged.lastRunDate =
    cDate && pDate ? (cDate >= pDate ? cDate : pDate) : cDate ?? pDate ?? null;
  merged.xp = Math.max(currentState.xp, p?.xp ?? 0);
  merged.totalRuns = Math.max(currentState.totalRuns, p?.totalRuns ?? 0);
  merged.totalDistanceKm = Math.max(
    currentState.totalDistanceKm,
    p?.totalDistanceKm ?? 0,
  );
  const cLen = currentState.runHistory?.length ?? 0;
  const pLen = p?.runHistory?.length ?? 0;
  merged.runHistory =
    cLen >= pLen
      ? currentState.runHistory
      : (p?.runHistory ?? currentState.runHistory);
  return merged;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      hasCompletedOnboarding: false,
      hasSeenIntro: false,
      iosAlwaysLocationPromptCompleted: false,
      audioMuted: false,
      xp: 0,
      streak: 0,
      lastRunDate: null,
      totalRuns: 0,
      totalDistanceKm: 0,
      longestStreak: 0,
      runHistory: [],
      personaId: null,

      markIntroSeen: () => set({ hasSeenIntro: true }),
      markIosAlwaysLocationPromptCompleted: () =>
        set({ iosAlwaysLocationPromptCompleted: true }),
      setAudioMuted: (muted) => {
        setAudioMutedFlag(muted);
        set({ audioMuted: muted });
        syncOnboardingAmbientWithMute();
      },

      completeOnboarding: (profile: UserProfile) => {
        set({
          profile,
          hasCompletedOnboarding: true,
          personaId: profile.personaId,
        });
      },

      completeRun: (
        missionId,
        missionType,
        actualDistanceKm,
        actualDurationMin,
        path,
        distanceGoalMet,
        activityMode,
        elapsedSec,
        runOptions,
      ) => {
        const state = get();
        const classLevel = Math.max(
          getLevelInfo(state.xp).level,
          state.profile?.startingClassLevel ?? 1,
        );
        const level = levelTierForClassLevel(classLevel);

        const distanceMet = distanceGoalMet ?? false;
        const onTime = runOptions?.onTime !== false;

        const countsAsMission = distanceMet;

        const streakForXp = state.streak;

        let timedKind: TimedMissionXpKind;
        let outcome: MissionOutcome;
        if (!distanceMet) {
          timedKind = 'incomplete';
          outcome = 'incomplete';
        } else if (onTime) {
          timedKind = 'on_time';
          outcome = 'success';
        } else {
          timedKind = 'late';
          outcome = 'partial_time';
        }

        const distRatio =
          actualDistanceKm != null &&
          runOptions?.targetDistanceKm != null &&
          runOptions.targetDistanceKm > 0
            ? actualDistanceKm / runOptions.targetDistanceKm
            : undefined;
        const xpEarned = calculateTimedMissionXp(
          missionType,
          streakForXp,
          timedKind,
          1,
          distRatio,
          runOptions?.missionBaseXp,
        );
        const newXp = state.xp + xpEarned;

        const distKm =
          actualDistanceKm ?? getMissionTargetDistance(missionType, level, classLevel);
        const durMin =
          actualDurationMin ?? getMissionTargetDuration(missionType, level, classLevel);

        const completedRun: CompletedRun = {
          missionId,
          completedAt: getNowISOString(),
          distanceKm: distKm,
          durationMin: durMin,
          xpEarned,
          streakDay: state.streak,
          goalMet: distanceMet,
          outcome,
          ...(activityMode ? { activityMode } : {}),
          ...(path && path.length > 0 ? { path } : {}),
        };

        set({
          xp: newXp,
          totalRuns: state.totalRuns + (countsAsMission ? 1 : 0),
          totalDistanceKm: state.totalDistanceKm + distKm,
          runHistory: [...state.runHistory, completedRun],
        });

        return completedRun;
      },

      appendRunHistoryEntry: (run) => {
        set((state) => ({
          runHistory: [...state.runHistory, run],
          totalDistanceKm: state.totalDistanceKm + run.distanceKm,
        }));
      },

      recordStreakOnMissionStart: () => {
        const today = getTodayISO();
        set((state) => {
          if (state.lastRunDate === today) return {};
          const alive = isStreakAlive(state.lastRunDate);
          const newStreak = alive ? state.streak + 1 : 1;
          return {
            streak: newStreak,
            lastRunDate: today,
            longestStreak: Math.max(state.longestStreak, newStreak),
          };
        });
      },

      recordEffortFromElapsedSec: (elapsedSec) => {
        if (elapsedSec < MIN_EFFORT_SECONDS) return;
        const today = getTodayISO();
        set((state) => {
          const alreadyStreakToday = state.lastRunDate === today;
          const alive = isStreakAlive(state.lastRunDate);
          let newStreak = state.streak;
          if (!alreadyStreakToday) {
            newStreak = alive ? state.streak + 1 : 1;
          }
          return {
            streak: newStreak,
            lastRunDate: today,
            longestStreak: Math.max(state.longestStreak, newStreak),
          };
        });
      },

      updateProfile: (updates) => {
        const state = get();
        if (!state.profile) return;
        const profile = { ...state.profile, ...updates };
        set({
          profile,
          ...(updates.personaId != null ? { personaId: updates.personaId } : {}),
        });
      },

      resetOnboarding: () => {
        setAudioMutedFlag(false);
        syncOnboardingAmbientWithMute();
        set({
          profile: null,
          hasCompletedOnboarding: false,
          hasSeenIntro: false,
          iosAlwaysLocationPromptCompleted: false,
          audioMuted: false,
          xp: 0,
          streak: 0,
          lastRunDate: null,
          totalRuns: 0,
          totalDistanceKm: 0,
          longestStreak: 0,
          runHistory: [],
          personaId: null,
        });
      },
    }),
    {
      name: 'runquest-user',
      storage: createJSONStorage(() => AsyncStorage),
      merge: mergeUserPersist,
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Record<string, unknown> & {
          totalCampaignsCompleted?: number;
          weeklyProgress?: unknown;
        };
        const { totalCampaignsCompleted: _c, weeklyProgress: _w, ...rest } = s;
        if (version < 4 && rest.iosAlwaysLocationPromptCompleted === undefined) {
          rest.iosAlwaysLocationPromptCompleted = true;
        }
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.audioMuted) setAudioMutedFlag(state.audioMuted);
        syncOnboardingAmbientWithMute();
      },
    },
  ),
);

export const selectLevelInfo = (state: UserStore) => getLevelInfo(state.xp);

function getMissionTargetDistance(
  type: MissionType,
  level: ExperienceLevel,
  classLevel: number,
): number {
  if (classLevel === 1) {
    return RECRUIT_TARGET_DISTANCES_KM[type] ?? 0.4;
  }
  const targets: Record<ExperienceLevel, Record<MissionType, number>> = {
    beginner: { easy: 3, recovery: 2, tempo: 3, interval: 3, long: 5 },
    intermediate: { easy: 5, recovery: 4, tempo: 6, interval: 5, long: 10 },
    advanced: { easy: 8, recovery: 6, tempo: 10, interval: 8, long: 16 },
    pro: { easy: 9, recovery: 7, tempo: 12, interval: 10, long: 18 },
  };
  return targets[level][type] ?? 5;
}

function getMissionTargetDuration(
  type: MissionType,
  level: ExperienceLevel,
  classLevel: number,
): number {
  if (classLevel === 1) {
    return 5;
  }
  const durations: Record<ExperienceLevel, Record<MissionType, number>> = {
    beginner: { easy: 25, recovery: 20, tempo: 25, interval: 25, long: 40 },
    intermediate: { easy: 35, recovery: 30, tempo: 40, interval: 35, long: 65 },
    advanced: { easy: 45, recovery: 40, tempo: 55, interval: 50, long: 95 },
    pro: { easy: 50, recovery: 45, tempo: 60, interval: 55, long: 105 },
  };
  return durations[level][type] ?? 30;
}
