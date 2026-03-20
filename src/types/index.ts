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

export interface UserProfile {
  experienceLevel: ExperienceLevel;
  runningGoal: RunningGoal;
  weeklyTargetMode: WeeklyTargetMode;
  weeklyTargetRuns: number;       // 1–7
  weeklyTargetDistance: number;   // km
  preferredDays: DayOfWeek[];
  paceLevel: PaceLevel;
}

// ─── Missions ────────────────────────────────────────────────────────────────

export type MissionType =
  | 'easy'
  | 'tempo'
  | 'long'
  | 'recovery'
  | 'interval';

export type MissionStatus = 'completed' | 'active' | 'upcoming' | 'locked';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  subtitle: string;
  description: string;
  targetDistanceKm: number;
  targetDurationMin: number;
  xpReward: number;
  day: DayOfWeek;
  scheduledDate: string;   // ISO date string YYYY-MM-DD
  status: MissionStatus;
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
  xp: number;
  streak: number;
  lastRunDate: string | null;   // ISO date YYYY-MM-DD
  totalRuns: number;
  totalDistanceKm: number;
  longestStreak: number;
  weeklyProgress: WeeklyProgress | null;
  runHistory: CompletedRun[];
}

export interface MissionsState {
  weekMissions: Mission[];
  weekStartDate: string | null;  // ISO date YYYY-MM-DD (Monday this week started)
}

// ─── Onboarding Temp State ───────────────────────────────────────────────────

export interface OnboardingDraft {
  experienceLevel?: ExperienceLevel;
  runningGoal?: RunningGoal;
  weeklyTargetMode?: WeeklyTargetMode;
  weeklyTargetRuns?: number;
  weeklyTargetDistance?: number;
  preferredDays?: DayOfWeek[];
  paceLevel?: PaceLevel;
}
