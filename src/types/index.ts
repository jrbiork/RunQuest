// ─── Onboarding & Profile ────────────────────────────────────────────────────

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type RunningGoal =
  | 'consistency'
  | 'distance'
  | 'speed'
  | 'habit'
  | 'race';

export type WeeklyTargetMode = 'runs' | 'distance';

export type PaceLevel = 'easy' | 'moderate' | 'fast';

export type DayOfWeek =
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
  | 'Sun';

export type PersonaId = 'ghost' | 'scout' | 'operative' | 'elite' | 'vanguard';

export type ActivityMode = 'run' | 'cycle';

export interface UserProfile {
  // Persona-based (new system)
  personaId: PersonaId;
  defaultActivityMode: ActivityMode;
  preferredDays: DayOfWeek[];
  weeklyTargetRuns: number;        // derived from preferredDays.length

  // Legacy fields kept for backward compat (optional so old profiles don't crash)
  experienceLevel?: ExperienceLevel;
  runningGoal?: RunningGoal;
  weeklyTargetMode?: WeeklyTargetMode;
  weeklyTargetDistance?: number;
  paceLevel?: PaceLevel;
}

// ─── Missions ────────────────────────────────────────────────────────────────

export type MissionType =
  | 'easy'
  | 'tempo'
  | 'long'
  | 'recovery'
  | 'interval';

export type MissionStatus = 'completed' | 'active' | 'upcoming' | 'locked' | 'failed';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  subtitle: string;
  description: string;
  targetDistanceKm: number;
  targetDurationMin: number;
  targetCyclingDistanceKm: number;
  targetCyclingDurationMin: number;
  xpReward: number;
  day: DayOfWeek;
  scheduledDate: string;   // ISO date string YYYY-MM-DD
  status: MissionStatus;
  // Campaign references
  campaignIndex?: number;  // 0-based campaign index
  campaignMissionIndex?: number;  // index within the campaign
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

export interface CampaignMissionTemplate {
  type: MissionType;
  title: string;
  subtitle: string;
  targetDistanceKm: number;
  targetDurationMin: number;
  targetCyclingDistanceKm: number;
  targetCyclingDurationMin: number;
  xpReward: number;
}

export interface CampaignTemplate {
  index: number;   // 1-based (1–10)
  title: string;
  subtitle: string;
  missionTemplates: CampaignMissionTemplate[];
}

// ─── GPS Tracking ─────────────────────────────────────────────────────────────

export interface GpsPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// ─── Run / Completion ────────────────────────────────────────────────────────

export interface CompletedRun {
  missionId: string;
  completedAt: string;    // ISO timestamp
  distanceKm: number;
  durationMin: number;
  xpEarned: number;
  streakDay: number;
  goalMet: boolean;       // true = hit distance or time target; false = finished early
  activityMode?: ActivityMode;
  path?: GpsPoint[];
}

// ─── XP / Levels ─────────────────────────────────────────────────────────────

export interface LevelInfo {
  level: number;
  title: string;
  xpInLevel: number;
  xpToNextLevel: number;
  progress: number;        // 0–1
  totalXp: number;
}

// ─── Weekly Progress ─────────────────────────────────────────────────────────

export interface WeeklyProgress {
  weekStartDate: string;   // ISO date YYYY-MM-DD (Monday)
  runsCompleted: number;
  distanceCompletedKm: number;
  missionsCompleted: string[];  // mission IDs
  bonusXpAwarded: boolean;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface UserState {
  profile: UserProfile | null;
  hasCompletedOnboarding: boolean;
  hasSeenIntro: boolean;
  audioMuted: boolean;
  xp: number;
  streak: number;
  lastRunDate: string | null;   // ISO date YYYY-MM-DD
  totalRuns: number;
  totalDistanceKm: number;
  longestStreak: number;
  weeklyProgress: WeeklyProgress | null;
  runHistory: CompletedRun[];
  personaId: PersonaId | null;
  totalCampaignsCompleted: number;
}

export interface MissionsState {
  weekMissions: Mission[];
  weekStartDate: string | null;  // ISO date YYYY-MM-DD (Monday this week started)
  // Campaign state
  currentCampaignIndex: number;   // 0-based
  campaignMissions: Mission[];
  campaignStartDate: string | null;
}

// ─── Onboarding Temp State ───────────────────────────────────────────────────

export interface OnboardingDraft {
  personaId?: PersonaId;
  preferredDays?: DayOfWeek[];
  defaultActivityMode?: ActivityMode;
  // Legacy fields for backward compat
  experienceLevel?: ExperienceLevel;
  runningGoal?: RunningGoal;
  weeklyTargetMode?: WeeklyTargetMode;
  weeklyTargetRuns?: number;
  weeklyTargetDistance?: number;
  paceLevel?: PaceLevel;
}
