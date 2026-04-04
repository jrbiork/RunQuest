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

/** Onboarding / persona survey (also used by `personaScoring`). */
export type RunDistanceAnswer = 'lt3' | '3-5' | '5-10' | '10plus';
export type CycleDistanceAnswer = 'lt10' | '10-25' | '25-60' | '60plus';
export type ExperienceAnswer = 'never' | 'lt3m' | '3-12m' | '1-3y' | '3yplus';
export type GoalAnswer = 'started' | 'fit' | 'endurance' | 'speed' | 'event';

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

export type MissionStatus =
  | 'completed'
  | 'active'
  | 'upcoming'
  | 'locked'
  | 'failed'
  | 'aborted';

/** In-run TTS cue variants per progress milestone (pickCue chooses one string per phase). */
export interface MissionAudioCueSet {
  start: string[];
  quarter: string[];
  half: string[];
  threeQuarter: string[];
  complete: string[];
}

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
  /** When set (e.g. campaign missions), overrides type-based MISSION_AUDIO_CUES during the run. */
  audioCues?: MissionAudioCueSet;
  // Campaign references
  campaignIndex?: number;  // 0-based campaign index
  campaignMissionIndex?: number;  // index within the campaign
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

export interface CampaignMissionTemplate {
  type: MissionType;
  title: string;
  subtitle: string;
  /** When set, overrides auto-generated briefing. */
  description?: string;
  /** When set, overrides auto-generated in-run TTS. */
  audioCues?: MissionAudioCueSet;
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
  /** Horizontal accuracy (m), when provided by the OS — used to filter GPS drift when stationary. */
  accuracy?: number;
}

// ─── Run / Completion ────────────────────────────────────────────────────────

/** How a mission attempt ended for history / stats. Omitted on older persisted runs. */
export type MissionOutcome = 'success' | 'failed_goal' | 'aborted';

export interface CompletedRun {
  missionId: string;
  completedAt: string;    // ISO timestamp
  distanceKm: number;
  durationMin: number;
  xpEarned: number;
  streakDay: number;
  goalMet: boolean;       // true = hit distance or time target; false = finished early or aborted
  activityMode?: ActivityMode;
  path?: GpsPoint[];
  /** When set, overrides inference from goalMet for stats. */
  outcome?: MissionOutcome;
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
  /** 0–7 from onboarding slider */
  trainingDaysPerWeek?: number;
  runDistance?: RunDistanceAnswer;
  cycleDistance?: CycleDistanceAnswer;
  experience?: ExperienceAnswer;
  goal?: GoalAnswer;
  // Legacy fields for backward compat
  experienceLevel?: ExperienceLevel;
  runningGoal?: RunningGoal;
  weeklyTargetMode?: WeeklyTargetMode;
  weeklyTargetRuns?: number;
  weeklyTargetDistance?: number;
  paceLevel?: PaceLevel;
}
