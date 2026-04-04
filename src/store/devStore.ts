import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDateOffsetMs } from '../utils/dateUtils';
import type { PersonaId, UserProfile } from '../types';
import { PERSONA_CAMPAIGNS } from '../constants/campaigns';
import { getNextIncompleteMission } from '../utils/missionGenerator';
import { nextPersonaId } from '../utils/personaScoring';
import { calculateXpEarned } from '../utils/xpCalculator';
import { MIN_EFFORT_SECONDS, useUserStore } from './userStore';
import { useMissionsStore } from './missionsStore';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DevStore {
  dayOffset: number; // integer days (can be negative)
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
        // Re-apply the persisted offset on app boot
        if (state && state.dayOffset !== 0) {
          setDateOffsetMs(state.dayOffset * MS_PER_DAY);
        }
      },
    },
  ),
);

/** Convenience selector: formatted mocked date string for display */
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
 * Marks up to `count` current journey missions as completed and appends matching
 * successful runs (XP, history, weekly progress) like finishing each with goal met.
 * Stops when there are no more incomplete missions. Does not advance campaigns.
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
  const markWeeklyBonusAwarded = useUserStore.getState().markWeeklyBonusAwarded;

  let completed = 0;
  for (let i = 0; i < count; i++) {
    const { campaignMissions, weekMissions } = useMissionsStore.getState();
    const list = campaignMissions.length > 0 ? campaignMissions : weekMissions;
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
    const xpEarned = calculateXpEarned(next.type, streak);

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
    );
    completed += 1;
  }

  const { campaignMissions: cm, weekMissions: wm } = useMissionsStore.getState();
  const allMissions = cm.length > 0 ? cm : wm;
  const allDone =
    allMissions.length > 0 && allMissions.every((m) => m.status === 'completed');
  const weeklyProgress = useUserStore.getState().weeklyProgress;
  if (allDone && weeklyProgress && !weeklyProgress.bonusXpAwarded) {
    markWeeklyBonusAwarded();
  }

  return { completed, requested };
}

export type DevFullCompleteAndUpgradeResult =
  | { outcome: 'upgraded'; previousPersona: PersonaId; newPersona: PersonaId }
  | { outcome: 'max_tier'; previousPersona: PersonaId }
  | { outcome: 'stuck'; previousPersona: PersonaId }
  | { outcome: 'no_campaigns'; previousPersona: PersonaId };

/**
 * Finishes every mission in every campaign for the current class, then bumps
 * `personaId` to the next tier (e.g. ghost → scout), resets campaign counter
 * state for the new track, and loads the first campaign of the new class.
 */
export function devCompleteAllCampaignsAndUpgradePersona(
  profile: UserProfile,
): DevFullCompleteAndUpgradeResult | null {
  const previousPersona = profile.personaId;
  if (!previousPersona) return null;

  const campaigns = PERSONA_CAMPAIGNS[previousPersona];
  if (!campaigns?.length) {
    return { outcome: 'no_campaigns', previousPersona };
  }

  const missions = useMissionsStore.getState();
  if (missions.campaignMissions.length === 0) {
    missions.initCampaign(profile);
  }

  const advanceCampaign = useMissionsStore.getState().advanceCampaign;
  let guard = 0;
  const guardMax = 500;

  while (useMissionsStore.getState().currentCampaignIndex < campaigns.length) {
    if (guard++ >= guardMax) {
      return { outcome: 'stuck', previousPersona };
    }

    const p = useUserStore.getState().profile ?? profile;
    devCompleteSuccessfulMissions(p, 9999);

    if (!useMissionsStore.getState().canAdvanceCampaign()) {
      return { outcome: 'stuck', previousPersona };
    }

    advanceCampaign(p);
  }

  const nextId = nextPersonaId(previousPersona);
  if (!nextId) {
    return { outcome: 'max_tier', previousPersona };
  }

  useUserStore.setState({ totalCampaignsCompleted: 0 });
  useUserStore.getState().updateProfile({ personaId: nextId });

  useMissionsStore.setState({ currentCampaignIndex: 0 });
  const updatedProfile = useUserStore.getState().profile;
  if (updatedProfile) {
    useMissionsStore.getState().initCampaign(updatedProfile);
  }

  return { outcome: 'upgraded', previousPersona, newPersona: nextId };
}
