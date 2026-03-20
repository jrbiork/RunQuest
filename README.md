# RunQuest 🏃

A Duolingo-inspired gamified running app built with Expo SDK 55 + React Native 0.83. Motivate yourself to run consistently through missions, streaks, XP, and levels — not just plain workout tracking.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 55 / React Native 0.83 / React 19.2 |
| Routing | Expo Router v5 (file-based) |
| State / Persistence | Zustand v5 + AsyncStorage |
| Animations | React Native Reanimated v4 |
| UI Extras | expo-linear-gradient, @expo/vector-icons |
| Language | TypeScript (strict) |

---

## Quick Start

**Prerequisites:** Node.js 20+, npm, Expo Go app on your phone (iOS or Android).

```bash
# 1. Clone / open the project
cd RunQuest

# 2. Install dependencies (already done — skip if node_modules exists)
npm install

# 3. Start the dev server
npx expo start

# 4. Scan the QR code with Expo Go (Android) or the Camera app (iOS)
```

> **Note:** Expo Go currently ships with SDK 54. To run SDK 55, you have two options:
> - **Development build (recommended):** `npx expo run:ios` or `npx expo run:android` — requires Xcode / Android Studio.
> - **Expo Go SDK 55 TestFlight (iOS):** Join the beta at https://testflight.apple.com/join/GZJxxfUU
> - **Expo Go SDK 55 on Android:** `npx expo start` then press `a` — Expo CLI will install the correct version.

---

## Project Structure

```
RunQuest/
├── app/                        Expo Router screens
│   ├── _layout.tsx             Root layout (Stack)
│   ├── index.tsx               Entry redirect → onboarding or tabs
│   ├── onboarding/             5-step onboarding flow
│   │   ├── _layout.tsx         Stack + shared onboarding draft context
│   │   ├── index.tsx           Step 1: Experience level
│   │   ├── goal.tsx            Step 2: Running goal
│   │   ├── weekly-target.tsx   Step 3: Weekly target (runs or km)
│   │   ├── run-days.tsx        Step 4: Preferred run days
│   │   └── pace.tsx            Step 5: Pace comfort → generates missions
│   ├── (tabs)/                 Main tab navigator
│   │   ├── _layout.tsx         Tab bar styling
│   │   ├── index.tsx           Home tab
│   │   ├── journey.tsx         Journey/mission path tab
│   │   └── profile.tsx         Profile + stats tab
│   └── run/                    Modal screens
│       ├── _layout.tsx
│       ├── [id].tsx            Mission detail (pre-run)
│       └── complete.tsx        Post-run celebration
│
├── src/
│   ├── types/index.ts          All shared TypeScript types
│   ├── constants/
│   │   ├── theme.ts            Design tokens (colors, spacing, radii, etc.)
│   │   └── missions.ts         Mission templates and motivational microcopy
│   ├── store/
│   │   ├── userStore.ts        XP, streak, level, profile — persisted
│   │   └── missionsStore.ts    Weekly missions — persisted, auto-refreshed
│   ├── utils/
│   │   ├── missionGenerator.ts Generates personalized missions from UserProfile
│   │   ├── xpCalculator.ts     XP awards, level thresholds, formatters
│   │   └── dateUtils.ts        Streak math, week boundaries, date helpers
│   ├── hooks/
│   │   └── useStreak.ts        Derived streak state with message
│   └── components/
│       ├── ui/                 Reusable primitives (Button, Card, ProgressBar, Badges)
│       ├── home/               Home tab components (DailyMissionCard, etc.)
│       ├── journey/            Journey tab components (MissionNode, JourneyPath)
│       └── onboarding/         Onboarding components (OptionCard, OnboardingLayout)
│
├── assets/                     App icons and splash screen
├── app.json                    Expo config
├── babel.config.js             Babel (includes reanimated worklets plugin)
└── tsconfig.json               TypeScript strict + path aliases
```

---

## App Flow

```
Launch
  └─ hasCompletedOnboarding?
       ├─ No  → /onboarding (5 steps) → generates missions → /(tabs)
       └─ Yes → /(tabs)/index (Home)
                    ├─ Home tab: Today's mission, level progress, weekly goal
                    ├─ Journey tab: Scrollable mission path for the week
                    └─ Profile tab: Stats, level history, run preferences

Tap a mission →  /run/[id]  (modal)
  └─ Complete Run →  /run/complete  (celebration modal)
       └─ Back to Journey / Home
```

---

## Gamification System

### XP
| Mission Type | Base XP |
|---|---|
| Easy Run | 50 XP |
| Recovery Run | 40 XP |
| Tempo Run | 75 XP |
| Intervals | 80 XP |
| Long Run | 100 XP |

Streak multiplier: `1 + (streak × 0.05)`, capped at 1.5× — so a 10-day streak gives 1.5× XP on every run.

Weekly completion bonus: **+150 XP** when all missions for the week are done.

### Levels
15 levels from *Rookie Runner* to *RunQuest Champion*. XP thresholds use a quadratic curve so early levels unlock fast (motivating) while later levels require sustained effort.

### Streaks
- Streak increments when you complete a run on a new day
- Streak is alive if your last run was today or yesterday
- Streak breaks if you go 2+ days without running
- Displayed prominently on Home and Profile with fire emoji

### Missions
Generated fresh every Monday based on your `UserProfile`:
- Experience level × Running goal × Weekly target → mission mix (Easy / Tempo / Long / Recovery / Interval)
- Each mission has gamified copy (title, subtitle, motivational framing, completion message)
- Stored in `missionsStore` with AsyncStorage persistence

---

## Architecture Decisions

**Zustand over Redux/Context:** Lightweight, TypeScript-friendly, no boilerplate. The `persist` middleware with `AsyncStorage` handles all local persistence without extra setup. Selectors are pure functions defined alongside each store.

**Expo Router v5:** File-based routing matches the Next.js mental model. Modal presentation (`run/` group), tab layout (`(tabs)/`), and stack layout (`onboarding/`) are all first-class. Deep linking works automatically.

**No backend yet:** All data lives in AsyncStorage via Zustand. The `UserProfile`, `Mission`, and `CompletedRun` types are designed to serialize cleanly to JSON for future API integration. The stores' action signatures won't change — only the storage layer swaps out.

**Reanimated v4:** Used for the ProgressBar width animation, MissionNode pulse, OptionCard spring tap, and the post-run confetti/celebration screen. The `useSharedValue` / `useAnimatedStyle` API keeps animations off the JS thread.

**Component structure:** Three layers — `ui/` (dumb primitives), feature components (`home/`, `journey/`, `onboarding/`), and screens (`app/`). Screens are thin orchestration layers; all real UI logic lives in components.

---

## Future Backend Integration

The architecture is ready for a backend. When you're ready:

1. Replace `createJSONStorage(() => AsyncStorage)` in each store with an API-backed storage adapter
2. The `completeRun()` action in `userStore` can fire a `POST /runs` alongside the local state update
3. `generateWeekMissions()` can be replaced with a `GET /missions/week` call
4. Add React Query (TanStack Query) as a data-fetching layer for server state, keeping Zustand for UI/session state only

---

## Development Notes

- `npx expo start --clear` to clear Metro cache if you hit bundler issues
- Reanimated v4 babel plugin is in `babel.config.js` as `react-native-reanimated/plugin` (which re-exports from `react-native-worklets/plugin`)
- Path alias `@/` maps to `src/` — configured in both `tsconfig.json` and `babel.config.js`
- All stores persist to AsyncStorage under keys `runquest-user` and `runquest-missions`
- To reset all local data: use the "Reset & Restart Onboarding" button in the Profile tab
# RunQuest
# RunQuest
