import { useEffect, useMemo, useCallback, useReducer } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore, selectWeeklyRunsTarget, selectWeeklyDistanceTarget } from '../../src/store/userStore';
import { getLevelInfo } from '../../src/utils/xpCalculator';
import { useMissionsStore } from '../../src/store/missionsStore';
import { getTodaysMission } from '../../src/utils/missionGenerator';
import { useStreak } from '../../src/hooks/useStreak';
import { DailyMissionCard } from '../../src/components/home/DailyMissionCard';
import { WeeklyProgressCard } from '../../src/components/home/WeeklyProgressCard';
import { CircularStatBadge } from '../../src/components/ui/CircularStatBadge';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
} from '../../src/constants/theme';
import {
  REST_DAY_MESSAGES,
} from '../../src/constants/missions';
import { useDevStore } from '../../src/store/devStore';
import { getWeekStartISO, parseLocalDate } from '../../src/utils/dateUtils';

function getRestMessage(): string {
  return REST_DAY_MESSAGES[Math.floor(Math.random() * REST_DAY_MESSAGES.length)] as string;
}

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const longestStreak = useUserStore((s) => s.longestStreak);
  const hasSeenIntro = useUserStore((s) => s.hasSeenIntro);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const distanceTarget = useUserStore(selectWeeklyDistanceTarget);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const refreshWeekly = useUserStore((s) => s.refreshWeeklyProgressIfNeeded);

  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const generateWeek = useMissionsStore((s) => s.generateWeek);
  const { streak } = useStreak();
  const dayOffset = useDevStore((s) => s.dayOffset);

  // Incrementing this forces a re-render so getTodaysMission re-evaluates
  // with the latest getTodayISO() value, even when mission lists haven't changed.
  const [dateTick, bumpDateTick] = useReducer((n: number) => n + 1, 0);

  // Mirrors the Journey tab pattern: compare stored week start vs mocked week start,
  // call generateWeek directly when they differ (avoids refreshIfNewWeek race condition).
  function syncMissions(p: typeof profile) {
    if (!p) return;
    const mockedWeekStart = getWeekStartISO();
    const storedWeekStart = useMissionsStore.getState().weekStartDate;
    if (mockedWeekStart !== storedWeekStart) {
      generateWeek(p);
    }
  }

  useEffect(() => {
    if (!hasSeenIntro) {
      router.replace('/intro');
      return;
    }
    if (!profile) {
      router.replace('/onboarding');
      return;
    }
    refreshWeekly();
    syncMissions(profile);
  }, []);

  // Re-check every time the dev-tool day changes (profile tab → home tab background)
  useEffect(() => {
    refreshWeekly();
    syncMissions(profile);
    bumpDateTick();
  }, [dayOffset]);

  // Re-check every time this tab gains focus (e.g. navigating back from profile)
  useFocusEffect(
    useCallback(() => {
      refreshWeekly();
      syncMissions(profile);
      bumpDateTick();
    }, [dayOffset, profile]),
  );

  // Match Journey: campaign list when active, else weekly missions
  const todaysMission = useMemo(() => {
    const list = campaignMissions.length > 0 ? campaignMissions : weekMissions;
    return getTodaysMission(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTick, campaignMissions, weekMissions]);

  // Week date range label — recomputed on every date tick
  const weekDateRange = useMemo(() => {
    const startIso = getWeekStartISO();
    const start = parseLocalDate(startIso);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTick]);

  const runsCompleted = weeklyProgress?.runsCompleted ?? 0;
  const distanceCompleted = weeklyProgress?.distanceCompletedKm ?? 0;

  const weeklyRunProgress = runsTarget > 0 ? runsCompleted / runsTarget : 0;
  const weeklyDistProgress = distanceTarget > 0 ? distanceCompleted / distanceTarget : 0;

  const handleStartRun = () => {
    if (todaysMission) {
      router.push({ pathname: '/run/[id]', params: { id: todaysMission.id } });
    }
  };

  const handleViewJourney = () => {
    router.push('/(tabs)/journey');
  };

  const handleSettings = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refreshWeekly();
              syncMissions(profile);
            }}
            tintColor={colors.orange}
          />
        }
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.wordmark}>RUNQUEST</Text>
            <View style={styles.levelBadge}>
              <MaterialIcons name="military-tech" size={12} color={colors.ochre} />
              <Text style={styles.levelBadgeText}>
                LVL {levelInfo.level} SCAVENGER
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSettings} style={styles.settingsBtn}>
            <MaterialIcons name="settings" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ─── Circular Stat Badges ────────────────────────────────────── */}
        <View style={styles.statsBadgeRow}>
          <CircularStatBadge
            value={streak}
            label="Day Streak"
            icon="local-fire-department"
            ringColor={colors.orange}
            progress={Math.min(streak / 30, 1)}
            size={84}
          />
          <CircularStatBadge
            value={levelInfo.level}
            label="Level"
            icon="military-tech"
            ringColor={colors.ochre}
            progress={levelInfo.progress}
            size={84}
          />
          <CircularStatBadge
            value={totalRuns}
            label="Sorties"
            icon="directions-run"
            ringColor={colors.primary}
            progress={Math.min(totalRuns / 50, 1)}
            size={84}
          />
          <CircularStatBadge
            value={`${longestStreak}d`}
            label="Best Streak"
            icon="emoji-events"
            ringColor={colors.blue}
            progress={Math.min(longestStreak / 30, 1)}
            size={84}
          />
        </View>

        {/* ─── Current Quest ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Current Quest</Text>
          </View>
          {todaysMission ? (
            <DailyMissionCard mission={todaysMission} onStartRun={handleStartRun} />
          ) : (
            <RestDayCard onViewJourney={handleViewJourney} />
          )}
        </View>

        {/* ─── Weekly Goal ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Weekly Goal</Text>
          </View>
          <WeeklyProgressCard
            runsCompleted={runsCompleted}
            runsTarget={runsTarget}
            distanceCompletedKm={distanceCompleted}
            distanceTargetKm={distanceTarget}
            mode={profile?.weeklyTargetMode ?? 'runs'}
            dateRange={weekDateRange}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function RestDayCard({ onViewJourney }: { onViewJourney: () => void }) {
  return (
    <Card style={styles.restCard}>
      <MaterialIcons name="self-improvement" size={44} color={colors.textTertiary} />
      <Text style={styles.restTitle}>{getRestMessage()}</Text>
      <Text style={styles.restSub}>No sortie scheduled today. Check your deployment schedule for the full week.</Text>
      <Button label="View Journey" onPress={onViewJourney} variant="secondary" size="md" style={styles.restBtn} />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  scroll: {
    flex: 1,
  } as ViewStyle,
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.xs,
  } as ViewStyle,

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  } as ViewStyle,
  headerLeft: {
    gap: spacing.xs,
  } as ViewStyle,
  wordmark: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.ochre,
    alignSelf: 'flex-start',
  } as ViewStyle,
  levelBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.ochre,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  settingsBtn: {
    padding: spacing.sm,
  } as ViewStyle,

  // Circular stats row
  statsBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  } as ViewStyle,

  // Section layout
  section: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  accentBar: {
    width: 3,
    height: 16,
    backgroundColor: colors.ochre,
    borderRadius: 2,
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,

  // Rest day
  restCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    marginVertical: spacing.sm,
  } as ViewStyle,
  restTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  restSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  } as TextStyle,
  restBtn: {
    marginTop: spacing.sm,
  } as ViewStyle,
});
