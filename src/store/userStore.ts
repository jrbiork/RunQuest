import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, UserState, WeeklyProgress, CompletedRun, GpsPoint } from '../types';
import {
  calculateXpEarned,
  getLevelInfo,
  WEEKLY_BONUS_XP,
} from '../utils/xpCalculator';
import {
  getTodayISO,
  getWeekStartISO,
  isStreakAlive,
  isNewWeek,
} from '../utils/dateUtils';

interface UserActions {
  completeOnboarding: (profile: UserProfile) => void;
  completeRun: (
    missionId: string,
    missionType: Parameters<typeof calculateXpEarned>[0],
    actualDistanceKm?: number,
    actualDurationMin?: number,
    path?: GpsPoint[],
    goalMet?: boolean,
  ) => CompletedRun;
  markWeeklyBonusAwarded: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
  refreshWeeklyProgressIfNeeded: () => void;
}

type UserStore = UserState & UserActions;

const initialWeeklyProgress = (): WeeklyProgress => ({
  weekStartDate: getWeekStartISO(),
  runsCompleted: 0,
  distanceCompletedKm: 0,
  missionsCompleted: [],
  bonusXpAwarded: false,
});

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ──────────────────────────────────────────────────
      profile: null,
      hasCompletedOnboarding: false,
      xp: 0,
      streak: 0,
      lastRunDate: null,
      totalRuns: 0,
      totalDistanceKm: 0,
      longestStreak: 0,
      weeklyProgress: null,
      runHistory: [],

      // ─── Actions ────────────────────────────────────────────────────────

      completeOnboarding: (profile: UserProfile) => {
        set({
          profile,
          hasCompletedOnboarding: true,
          weeklyProgress: initialWeeklyProgress(),
        });
      },

      completeRun: (missionId, missionType, actualDistanceKm, actualDurationMin, path, goalMet) => {
        const state = get();
        const today = getTodayISO();
        const level = state.profile?.experienceLevel ?? 'beginner';

        // Streak logic
        const alive = isStreakAlive(state.lastRunDate);
        const alreadyRanToday = state.lastRunDate === today;
        const newStreak = alreadyRanToday
          ? state.streak
          : alive
          ? state.streak + 1
          : 1;

        const streakForXp = alreadyRanToday ? state.streak : newStreak;
        const xpEarned = calculateXpEarned(missionType, streakForXp);
        const newXp = state.xp + xpEarned;

        // Use actual GPS values when available, otherwise fall back to mission defaults
        const distKm = actualDistanceKm ?? getMissionTargetDistance(missionType, level);
        const durMin = actualDurationMin ?? getMissionTargetDuration(missionType, level);

        // Weekly progress
        const wp = state.weeklyProgress ?? initialWeeklyProgress();
        const freshWeek = isNewWeek(wp.weekStartDate);
        const currentWp: WeeklyProgress = freshWeek ? initialWeeklyProgress() : wp;

        const updatedWp: WeeklyProgress = {
          ...currentWp,
          runsCompleted: currentWp.runsCompleted + 1,
          distanceCompletedKm: currentWp.distanceCompletedKm + distKm,
          missionsCompleted: [...currentWp.missionsCompleted, missionId],
        };

        const completedRun: CompletedRun = {
          missionId,
          completedAt: new Date().toISOString(),
          distanceKm: distKm,
          durationMin: durMin,
          xpEarned,
          streakDay: newStreak,
          goalMet: goalMet ?? false,
          ...(path && path.length > 0 ? { path } : {}),
        };

        set({
          xp: newXp,
          streak: newStreak,
          lastRunDate: today,
          totalRuns: state.totalRuns + 1,
          totalDistanceKm: state.totalDistanceKm + distKm,
          longestStreak: Math.max(state.longestStreak, newStreak),
          weeklyProgress: updatedWp,
          runHistory: [...state.runHistory, completedRun],
        });

        return completedRun;
      },

      markWeeklyBonusAwarded: () => {
        const state = get();
        if (!state.weeklyProgress) return;
        set({
          xp: state.xp + WEEKLY_BONUS_XP,
          weeklyProgress: { ...state.weeklyProgress, bonusXpAwarded: true },
        });
      },

      updateProfile: (updates) => {
        const state = get();
        if (!state.profile) return;
        set({ profile: { ...state.profile, ...updates } });
      },

      resetOnboarding: () => {
        set({
          profile: null,
          hasCompletedOnboarding: false,
          xp: 0,
          streak: 0,
          lastRunDate: null,
          totalRuns: 0,
          totalDistanceKm: 0,
          longestStreak: 0,
          weeklyProgress: null,
          runHistory: [],
        });
      },

      refreshWeeklyProgressIfNeeded: () => {
        const state = get();
        if (!state.weeklyProgress) {
          set({ weeklyProgress: initialWeeklyProgress() });
          return;
        }
        if (isNewWeek(state.weeklyProgress.weekStartDate)) {
          set({ weeklyProgress: initialWeeklyProgress() });
        }
      },
    }),
    {
      name: 'runquest-user',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

export const selectLevelInfo = (state: UserStore) => getLevelInfo(state.xp);

export const selectWeeklyRunsTarget = (state: UserStore): number => {
  if (!state.profile) return 3;
  if (state.profile.weeklyTargetMode === 'runs') return state.profile.weeklyTargetRuns;
  return 3;
};

export const selectWeeklyDistanceTarget = (state: UserStore): number => {
  if (!state.profile) return 15;
  if (state.profile.weeklyTargetMode === 'distance') return state.profile.weeklyTargetDistance;
  return state.profile.weeklyTargetRuns * 5;
};

// ─── Helpers (duplicated here to avoid circular dep) ─────────────────────────

function getMissionTargetDistance(
  type: Parameters<typeof calculateXpEarned>[0],
  level: 'beginner' | 'intermediate' | 'advanced',
): number {
  const targets = {
    beginner:     { easy: 3, recovery: 2, tempo: 3, interval: 3, long: 5 },
    intermediate: { easy: 5, recovery: 4, tempo: 6, interval: 5, long: 10 },
    advanced:     { easy: 8, recovery: 6, tempo: 10, interval: 8, long: 16 },
  };
  return targets[level][type] ?? 5;
}

function getMissionTargetDuration(
  type: Parameters<typeof calculateXpEarned>[0],
  level: 'beginner' | 'intermediate' | 'advanced',
): number {
  const durations = {
    beginner:     { easy: 25, recovery: 20, tempo: 25, interval: 25, long: 40 },
    intermediate: { easy: 35, recovery: 30, tempo: 40, interval: 35, long: 65 },
    advanced:     { easy: 45, recovery: 40, tempo: 55, interval: 50, long: 95 },
  };
  return durations[level][type] ?? 30;
}
