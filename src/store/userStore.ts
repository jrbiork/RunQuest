import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
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
import { setAudioMutedFlag, syncOnboardingAmbientWithMute } from '../services/audioService';
import { getTodayISO, getNowISOString, isStreakAlive } from '../utils/dateUtils';
import type { MissionType } from '../types';

/** Minimum moving time (seconds) for effort-based credit when the mission goal is not met. */
export const MIN_EFFORT_SECONDS = 5 * 60;

export type CompleteRunOptions = {
  /** When distance target was met, whether it was at or under target time. False = partial completion (half XP). */
  onTime?: boolean;
};

interface UserActions {
  completeOnboarding: (profile: UserProfile) => void;
  markIntroSeen: () => void;
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

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,
      hasCompletedOnboarding: false,
      hasSeenIntro: false,
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
        const level = ((state.profile?.experienceLevel) ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced';

        const distanceMet = distanceGoalMet ?? false;
        const onTime = runOptions?.onTime !== false;

        const effortQualifies =
          elapsedSec != null
            ? elapsedSec >= MIN_EFFORT_SECONDS
            : (actualDurationMin ?? 0) * 60 >= MIN_EFFORT_SECONDS;

        const countsAsSortie = effortQualifies || distanceMet;

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

        const xpEarned = calculateTimedMissionXp(missionType, streakForXp, timedKind);
        const newXp = state.xp + xpEarned;

        const distKm = actualDistanceKm ?? getMissionTargetDistance(missionType, level);
        const durMin = actualDurationMin ?? getMissionTargetDuration(missionType, level);

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
          totalRuns: state.totalRuns + (countsAsSortie ? 1 : 0),
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
            totalRuns: state.totalRuns + 1,
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
      version: 3,
      migrate: (persisted: unknown) => {
        const s = persisted as Record<string, unknown> & {
          totalCampaignsCompleted?: number;
          weeklyProgress?: unknown;
        };
        const { totalCampaignsCompleted: _c, weeklyProgress: _w, ...rest } = s;
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
  level: 'beginner' | 'intermediate' | 'advanced',
): number {
  const targets = {
    beginner: { easy: 3, recovery: 2, tempo: 3, interval: 3, long: 5 },
    intermediate: { easy: 5, recovery: 4, tempo: 6, interval: 5, long: 10 },
    advanced: { easy: 8, recovery: 6, tempo: 10, interval: 8, long: 16 },
  };
  return targets[level][type] ?? 5;
}

function getMissionTargetDuration(
  type: MissionType,
  level: 'beginner' | 'intermediate' | 'advanced',
): number {
  const durations = {
    beginner: { easy: 25, recovery: 20, tempo: 25, interval: 25, long: 40 },
    intermediate: { easy: 35, recovery: 30, tempo: 40, interval: 35, long: 65 },
    advanced: { easy: 45, recovery: 40, tempo: 55, interval: 50, long: 95 },
  };
  return durations[level][type] ?? 30;
}
