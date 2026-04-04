import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  UserProfile,
  UserState,
  WeeklyProgress,
  CompletedRun,
  GpsPoint,
  PersonaId,
  MissionOutcome,
} from '../types';
import {
  calculateXpEarned,
  getLevelInfo,
  WEEKLY_BONUS_XP,
} from '../utils/xpCalculator';
import { setAudioMutedFlag, syncOnboardingAmbientWithMute } from '../services/audioService';
import {
  getTodayISO,
  getWeekStartISO,
  getNowISOString,
  isStreakAlive,
  isNewWeek,
} from '../utils/dateUtils';

/** Minimum moving time (seconds) for effort-based credit when the mission goal is not met. */
export const MIN_EFFORT_SECONDS = 5 * 60;

interface UserActions {
  completeOnboarding: (profile: UserProfile) => void;
  markIntroSeen: () => void;
  setAudioMuted: (muted: boolean) => void;
  completeRun: (
    missionId: string,
    missionType: Parameters<typeof calculateXpEarned>[0],
    actualDistanceKm?: number,
    actualDurationMin?: number,
    path?: GpsPoint[],
    goalMet?: boolean,
    activityMode?: import('../types').ActivityMode,
    /** When set, effort eligibility uses raw GPS seconds (≥300 = 5 min). */
    elapsedSec?: number,
  ) => CompletedRun;
  /** Log-only entry (e.g. aborted mid-run): no XP, streak, or weekly progress; adds distance to lifetime total. */
  appendRunHistoryEntry: (run: CompletedRun) => void;
  /** Day streak: once per calendar day when a campaign mission run starts (active tracking). Free runs use recordEffortFromElapsedSec. */
  recordStreakOnMissionStart: () => void;
  /** +1 sortie when moving ≥ MIN_EFFORT_SECONDS (e.g. free run). Streak only if not already counted today. */
  recordEffortFromElapsedSec: (elapsedSec: number) => void;
  markWeeklyBonusAwarded: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
  refreshWeeklyProgressIfNeeded: () => void;
  incrementCampaignsCompleted: () => void;
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
      hasSeenIntro: false,
      audioMuted: false,
      xp: 0,
      streak: 0,
      lastRunDate: null,
      totalRuns: 0,
      totalDistanceKm: 0,
      longestStreak: 0,
      weeklyProgress: null,
      runHistory: [],
      personaId: null,
      totalCampaignsCompleted: 0,

      // ─── Actions ────────────────────────────────────────────────────────

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
          weeklyProgress: initialWeeklyProgress(),
          personaId: profile.personaId,
        });
      },

      completeRun: (missionId, missionType, actualDistanceKm, actualDurationMin, path, goalMet, activityMode, elapsedSec) => {
        const state = get();
        const level = ((state.profile?.experienceLevel) ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced';

        const met = goalMet ?? false;

        // ≥5 min moving (GPS seconds or duration fallback), or mission goal met (short missions still count).
        const effortQualifies =
          elapsedSec != null
            ? elapsedSec >= MIN_EFFORT_SECONDS
            : (actualDurationMin ?? 0) * 60 >= MIN_EFFORT_SECONDS;

        /** Sorties: goal met OR enough time on feet. Streak is set at mission start (recordStreakOnMissionStart), not here. */
        const countsAsSortie = effortQualifies || met;

        const streakForXp = state.streak;

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

        const outcome: MissionOutcome = met ? 'success' : 'failed_goal';
        const completedRun: CompletedRun = {
          missionId,
          completedAt: getNowISOString(),
          distanceKm: distKm,
          durationMin: durMin,
          xpEarned,
          streakDay: state.streak,
          goalMet: met,
          outcome,
          ...(activityMode ? { activityMode } : {}),
          ...(path && path.length > 0 ? { path } : {}),
        };

        set({
          xp: newXp,
          totalRuns: state.totalRuns + (countsAsSortie ? 1 : 0),
          totalDistanceKm: state.totalDistanceKm + distKm,
          weeklyProgress: updatedWp,
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
          weeklyProgress: null,
          runHistory: [],
          personaId: null,
          totalCampaignsCompleted: 0,
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

      incrementCampaignsCompleted: () =>
        set((state) => ({ totalCampaignsCompleted: state.totalCampaignsCompleted + 1 })),
    }),
    {
      name: 'runquest-user',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.audioMuted) setAudioMutedFlag(state.audioMuted);
        syncOnboardingAmbientWithMute();
      },
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

export const selectLevelInfo = (state: UserStore) => getLevelInfo(state.xp);

export const selectWeeklyRunsTarget = (state: UserStore): number => {
  if (!state.profile) return 3;
  // New persona-based system: use preferredDays length
  if (state.profile.preferredDays?.length > 0) return state.profile.preferredDays.length;
  if (state.profile.weeklyTargetMode === 'runs') return state.profile.weeklyTargetRuns;
  return 3;
};

export const selectWeeklyDistanceTarget = (state: UserStore): number => {
  if (!state.profile) return 15;
  if (state.profile.weeklyTargetMode === 'distance') return state.profile.weeklyTargetDistance ?? 15;
  return (state.profile.weeklyTargetRuns ?? state.profile.preferredDays.length) * 5;
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
