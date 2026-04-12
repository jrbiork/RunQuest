# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Expo dev server
npx expo start

# Run on specific platform
npx expo run:ios
npx expo run:android

# Sync audio cue requires (after adding new cue audio files)
npm run sync:cue-requires

# Generate TTS MP3s for run cues
npm run generate:run-cues
```

There are no lint or test scripts configured — linting is via TypeScript compiler (`tsc --noEmit`).

## Architecture

**Stack**: Expo SDK 55 / React Native 0.83.2 / Expo Router v5 (file-based routing) / Zustand v5 / TypeScript strict mode

**Path alias**: `@/` maps to `src/` (configured in both `tsconfig.json` and `babel.config.js`).

### Routing

Expo Router file-based routing:
- `app/index.tsx` — entry point, redirects based on onboarding state
- `app/(tabs)/` — main tab navigator with a custom `WastelandTabBar` (5 tabs: Home, Journey, Free Run FAB, Stats, Profile)
- `app/run/` — modal screens (mission pre-run detail, live GPS tracking, post-run complete, history)
- `app/onboarding/` — 5-step onboarding flow
- Swipe-to-dismiss is gated by `runSessionStore.isRunActive` during live GPS runs

### State (Zustand stores in `src/store/`)

| Store | Persisted | Key data |
|---|---|---|
| `userStore` | AsyncStorage (`runquest-user`) | XP, level, streak, `runHistory: CompletedRun[]`, `profile: UserProfile` |
| `missionsStore` | AsyncStorage (`runquest-missions`) | `weekMissions: Mission[]`, generated fresh each Monday |
| `runSessionStore` | No (in-memory) | `isRunActive: boolean` |
| `devStore` | No | Development utilities |

All storage is local — no backend. Types in `src/types/index.ts` are designed so the storage layer can be swapped later.

### GPS Tracking (`src/hooks/useGpsTracking.ts`)

Background tracking via `expo-task-manager` + `expo-location`. The filtering pipeline produces two path arrays stored per `CompletedRun`:
- **`acceptedPath`**: canonical points (filters poor accuracy, jitter, implausible jumps, stationary creep)
- **`displayPath`**: lightly smoothed derivative for polyline rendering on maps

A warmup period delays drawing until signal quality stabilizes.

### Gamification

- **XP per mission**: Easy/Recovery = 100, Tempo/Interval = 150, Long = 220
- **Streak multiplier**: `1 + (streak × 0.05)`, capped at 1.5×
- **Weekly completion bonus**: +150 XP
- **30 levels** with quadratic XP thresholds (see `LEVEL_THRESHOLDS` in `src/utils/xpCalculator.ts`)
- **Missions** regenerate every Monday based on the user's persona + goal + weekly target (see `src/utils/missionGenerator.ts`)
- **5 mission types**: Easy (Grid Patrol), Tempo (Signal Rush), Long (Supply Route), Recovery (Scout), Interval (Surge)
- **`FUN_RUN_ID`** constant is used for free runs (no mission)
- **`MIN_EFFORT_SECONDS`** = 300s of moving time for partial mission credit

### Design System (`src/constants/theme.ts`)

Post-apocalyptic wasteland aesthetic. Key tokens:
- **Backgrounds**: `#0E1210`, `#161B19`, `#1F2623`
- **Primary text**: `#D4D6CF`; secondary: `#9A968E`; tertiary: `#5C5850`
- **Accent**: lime `#7eff00` (FAB, highlights); tactical green `#679058`; safety orange `#F68F4D`
- **Spacing scale**: `xs`=4 → `huge`=48px
- **Font sizes**: `xs`=11 → `display`=38px

All components should use theme constants rather than hardcoded values.

### Component Layers

`src/components/ui/` (primitives) → `src/components/{home,journey,run,progress,onboarding}/` (feature components) → `app/` (screens)

Key patterns:
- Reanimated v4 used for ProgressBar, MissionNode pulse, OptionCard spring, post-run celebration
- Store selectors are pure functions exported from stores (e.g., `selectNextMission`)
- Strict TypeScript — no `any`, no unchecked indexed access
