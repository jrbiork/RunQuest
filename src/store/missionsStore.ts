import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mission, MissionsState, UserProfile, PersonaId, CampaignTemplate } from '../types';
import { useUserStore } from './userStore';
import { generateWeekMissions, getTodaysMission } from '../utils/missionGenerator';
import { getWeekStartISO, isNewWeek, getTodayISO, getScheduledDatesForWeek, getWeekStart, getNow } from '../utils/dateUtils';
import { PERSONA_CAMPAIGNS } from '../constants/campaigns';
import { MISSION_TEMPLATES } from '../constants/missions';
import { BASE_XP } from '../utils/xpCalculator';

interface MissionsActions {
  // Legacy weekly generation (free run compatibility)
  generateWeek: (profile: UserProfile) => void;
  completeMission: (missionId: string, xpEarned?: number) => void;
  failMission: (missionId: string) => void;
  retryMission: (missionId: string) => void;
  refreshIfNewWeek: (profile: UserProfile) => void;

  // Campaign actions
  initCampaign: (profile: UserProfile) => void;
  advanceCampaign: (profile: UserProfile) => void;
  canAdvanceCampaign: () => boolean;
}

type MissionsStore = MissionsState & MissionsActions;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function buildCampaignMissions(
  profile: UserProfile,
  campaign: CampaignTemplate,
  campaignIndex: number,
): Mission[] {
  const { preferredDays } = profile;
  const today = getTodayISO();
  const weekStart = getWeekStart(getNow());
  const scheduledDates = getScheduledDatesForWeek(preferredDays, weekStart);

  return preferredDays.map((day, dayIdx) => {
    const templateIdx = dayIdx % campaign.missionTemplates.length;
    const template = campaign.missionTemplates[templateIdx]!;
    const missionCopy = MISSION_TEMPLATES[template.type];
    const scheduledDate = scheduledDates[dayIdx] ?? today;

    let status: Mission['status'];
    if (scheduledDate < today) {
      status = 'upcoming';
    } else if (scheduledDate === today || dayIdx === 0) {
      status = 'active';
    } else {
      status = 'upcoming';
    }

    return {
      id: `campaign-${campaignIndex}-day-${dayIdx}`,
      type: template.type,
      title: template.title,
      subtitle: template.subtitle,
      description: pick(missionCopy.descriptions),
      targetDistanceKm: 1,
      targetDurationMin: 5,
      targetCyclingDistanceKm: 1,
      targetCyclingDurationMin: 5,
      xpReward: template.xpReward,
      day,
      scheduledDate,
      status,
      campaignIndex,
      campaignMissionIndex: dayIdx,
    } satisfies Mission;
  });
}

export const useMissionsStore = create<MissionsStore>()(
  persist(
    (set, get) => ({
      // ─── Initial State ────────────────────────────────────────────────
      weekMissions: [],
      weekStartDate: null,
      currentCampaignIndex: 0,
      campaignMissions: [],
      campaignStartDate: null,

      // ─── Legacy Weekly Actions ────────────────────────────────────────

      generateWeek: (profile: UserProfile) => {
        const state = get();
        // Campaign path is authoritative — do not replace with legacy weekly missions
        if (state.campaignMissions.length > 0) {
          set({
            weekMissions: [...state.campaignMissions],
            weekStartDate: getWeekStartISO(),
          });
          return;
        }
        const missions = generateWeekMissions(profile);
        set({
          weekMissions: missions,
          weekStartDate: getWeekStartISO(),
        });
      },

      completeMission: (missionId: string, xpEarned?: number) => {
        set((state) => {
          const updateList = (list: Mission[]) =>
            list.map((m) =>
              m.id === missionId
                ? { ...m, status: 'completed' as const, ...(xpEarned !== undefined ? { xpReward: xpEarned } : {}) }
                : m,
            );
          return {
            weekMissions: updateList(state.weekMissions),
            campaignMissions: updateList(state.campaignMissions),
          };
        });
      },

      failMission: (missionId: string) => {
        set((state) => {
          const updateList = (list: Mission[]) =>
            list.map((m) => (m.id === missionId ? { ...m, status: 'failed' as const } : m));
          return {
            weekMissions: updateList(state.weekMissions),
            campaignMissions: updateList(state.campaignMissions),
          };
        });
      },

      retryMission: (missionId: string) => {
        set((state) => {
          const updateList = (list: Mission[]) =>
            list.map((m) => (m.id === missionId && m.status === 'failed' ? { ...m, status: 'active' as const } : m));
          return {
            weekMissions: updateList(state.weekMissions),
            campaignMissions: updateList(state.campaignMissions),
          };
        });
      },

      refreshIfNewWeek: (profile: UserProfile) => {
        const state = get();
        if (isNewWeek(state.weekStartDate) || state.weekMissions.length === 0) {
          if (state.campaignMissions.length > 0) {
            set({
              weekMissions: [...state.campaignMissions],
              weekStartDate: getWeekStartISO(),
            });
            return;
          }
          const missions = generateWeekMissions(profile);
          set({
            weekMissions: missions,
            weekStartDate: getWeekStartISO(),
          });
        }
      },

      // ─── Campaign Actions ─────────────────────────────────────────────

      initCampaign: (profile: UserProfile) => {
        const state = get();
        const personaId = profile.personaId;
        const campaigns = PERSONA_CAMPAIGNS[personaId];
        if (!campaigns) return;

        const idx = state.currentCampaignIndex;
        const campaign = campaigns[idx];
        if (!campaign) return;

        const missions = buildCampaignMissions(profile, campaign, idx);
        set({
          campaignMissions: missions,
          campaignStartDate: getTodayISO(),
          weekMissions: missions,
          weekStartDate: getWeekStartISO(),
        });
      },

      advanceCampaign: (profile: UserProfile) => {
        const state = get();
        if (!get().canAdvanceCampaign()) return;

        const personaId = profile.personaId;
        const campaigns = PERSONA_CAMPAIGNS[personaId];
        const nextIdx = state.currentCampaignIndex + 1;

        if (!campaigns || nextIdx >= campaigns.length) {
          // All campaigns complete — just mark all done
          set({ currentCampaignIndex: nextIdx });
          useUserStore.getState().incrementCampaignsCompleted();
          return;
        }

        const nextCampaign = campaigns[nextIdx]!;
        const missions = buildCampaignMissions(profile, nextCampaign, nextIdx);
        set({
          currentCampaignIndex: nextIdx,
          campaignMissions: missions,
          campaignStartDate: getTodayISO(),
          weekMissions: missions,
          weekStartDate: getWeekStartISO(),
        });
        useUserStore.getState().incrementCampaignsCompleted();
      },

      canAdvanceCampaign: () => {
        const { campaignMissions } = get();
        if (campaignMissions.length === 0) return false;
        const hasFailed = campaignMissions.some((m) => m.status === 'failed');
        const hasActive = campaignMissions.some(
          (m) => m.status === 'active' || m.status === 'upcoming',
        );
        return !hasFailed && !hasActive;
      },
    }),
    {
      name: 'runquest-missions',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// ─── Derived selectors ────────────────────────────────────────────────────────

/** Same list Journey / home use — campaign missions when active, else weekly legacy */
function primaryMissionList(state: MissionsStore): Mission[] {
  return state.campaignMissions.length > 0 ? state.campaignMissions : state.weekMissions;
}

export const selectTodaysMission = (state: MissionsStore): Mission | null =>
  getTodaysMission(primaryMissionList(state));

export const selectCompletedCount = (state: MissionsStore): number =>
  state.campaignMissions.length > 0
    ? state.campaignMissions.filter((m) => m.status === 'completed').length
    : state.weekMissions.filter((m) => m.status === 'completed').length;

export const selectAllComplete = (state: MissionsStore): boolean => {
  const missions = state.campaignMissions.length > 0 ? state.campaignMissions : state.weekMissions;
  return missions.length > 0 && missions.every((m) => m.status === 'completed');
};

export const selectNextMission = (state: MissionsStore): Mission | null => {
  const missions = primaryMissionList(state);
  const today = getTodayISO();
  // Today's active mission first
  const todayActive = missions.find(
    (m) => m.scheduledDate === today && m.status === 'active',
  );
  if (todayActive) return todayActive;
  // Today's failed mission (for retry — same day, should still be attempted)
  const todayFailed = missions.find(
    (m) => m.scheduledDate === today && m.status === 'failed',
  );
  if (todayFailed) return todayFailed;
  // Next future non-completed, non-failed mission
  return missions.find((m) => m.status !== 'completed' && m.status !== 'failed') ?? null;
};

export const selectCampaignXpEarned = (state: MissionsStore): number =>
  state.campaignMissions
    .filter((m) => m.status === 'completed')
    .reduce((sum, m) => sum + m.xpReward, 0);

export const selectCampaignXpTotal = (state: MissionsStore): number =>
  state.campaignMissions.reduce((sum, m) => sum + m.xpReward, 0);

export const selectCurrentCampaign = (
  state: MissionsStore,
  personaId: PersonaId,
): CampaignTemplate | null => {
  const campaigns = PERSONA_CAMPAIGNS[personaId];
  return campaigns?.[state.currentCampaignIndex] ?? null;
};
