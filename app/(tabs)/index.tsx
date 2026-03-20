import { useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore, selectWeeklyRunsTarget, selectWeeklyDistanceTarget } from '../../src/store/userStore';
import { getLevelInfo } from '../../src/utils/xpCalculator';
import { useMissionsStore, selectTodaysMission } from '../../src/store/missionsStore';
import { useStreak } from '../../src/hooks/useStreak';
import { DailyMissionCard } from '../../src/components/home/DailyMissionCard';
import { WeeklyProgressCard } from '../../src/components/home/WeeklyProgressCard';
import { LevelProgressCard } from '../../src/components/home/LevelProgressCard';
import { StreakBadge } from '../../src/components/ui/StreakBadge';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  radii,
} from '../../src/constants/theme';
import {
  GREETINGS_BY_TIME,
  STREAK_MESSAGES,
  REST_DAY_MESSAGES,
} from '../../src/constants/missions';
import { getTimeOfDay } from '../../src/utils/dateUtils';

function getGreeting(): string {
  const tod = getTimeOfDay();
  const msgs = GREETINGS_BY_TIME[tod];
  return msgs[Math.floor(Math.random() * msgs.length)] as string;
}

function getStreakMessage(streak: number): string {
  const keys = Object.keys(STREAK_MESSAGES)
    .map(Number)
    .filter((k) => streak >= k)
    .sort((a, b) => b - a);
  const key = keys[0] ?? 0;
  const msgs = STREAK_MESSAGES[key as keyof typeof STREAK_MESSAGES] ?? STREAK_MESSAGES[0];
  return msgs[Math.floor(Math.random() * msgs.length)] as string;
}

function getRestMessage(): string {
  return REST_DAY_MESSAGES[Math.floor(Math.random() * REST_DAY_MESSAGES.length)] as string;
}

export default function HomeScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const longestStreak = useUserStore((s) => s.longestStreak);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const distanceTarget = useUserStore(selectWeeklyDistanceTarget);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const refreshWeekly = useUserStore((s) => s.refreshWeeklyProgressIfNeeded);

  const todaysMission = useMissionsStore(selectTodaysMission);
  const refreshMissions = useMissionsStore((s) => s.refreshIfNewWeek);

  const { streak, isAlive } = useStreak();

  useEffect(() => {
    refreshWeekly();
    if (profile) refreshMissions(profile);
  }, []);

  const runsCompleted = weeklyProgress?.runsCompleted ?? 0;
  const distanceCompleted = weeklyProgress?.distanceCompletedKm ?? 0;

  const handleStartRun = () => {
    if (todaysMission) {
      router.push({ pathname: '/run/[id]', params: { id: todaysMission.id } });
    }
  };

  const handleViewJourney = () => {
    router.push('/(tabs)/journey');
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
              if (profile) refreshMissions(profile);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.streakMessage}>{getStreakMessage(streak)}</Text>
          </View>
          <StreakBadge streak={streak} isAlive={isAlive} size="lg" />
        </View>

        {/* Today's Mission */}
        {todaysMission ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Mission</Text>
            <DailyMissionCard mission={todaysMission} onStartRun={handleStartRun} />
          </View>
        ) : (
          <RestDayCard onViewJourney={handleViewJourney} />
        )}

        {/* Level progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Level</Text>
          <LevelProgressCard levelInfo={levelInfo} />
        </View>

        {/* Weekly progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Goal</Text>
          <WeeklyProgressCard
            runsCompleted={runsCompleted}
            runsTarget={runsTarget}
            distanceCompletedKm={distanceCompleted}
            distanceTargetKm={distanceTarget}
            mode={profile?.weeklyTargetMode ?? 'runs'}
          />
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Total Runs" value={totalRuns.toString()} icon="directions-run" iconColor={colors.primary} />
          <StatCard label="Longest Streak" value={`${longestStreak}d`} icon="local-fire-department" iconColor={colors.orange} />
          <StatCard label="Level" value={levelInfo.level.toString()} icon="military-tech" iconColor={colors.purple} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RestDayCard({ onViewJourney }: { onViewJourney: () => void }) {
  return (
    <Card style={styles.restCard}>
      <MaterialIcons name="self-improvement" size={48} color={colors.textTertiary} />
      <Text style={styles.restTitle}>{getRestMessage()}</Text>
      <Text style={styles.restSub}>No mission scheduled today. Check your journey for the full week.</Text>
      <Button label="View Journey" onPress={onViewJourney} variant="secondary" size="md" style={styles.restBtn} />
    </Card>
  );
}

function StatCard({ label, value, icon, iconColor }: { label: string; value: string; icon: string; iconColor: string }) {
  return (
    <Card style={styles.statCard}>
      <MaterialIcons name={icon as any} size={26} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.xs,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.lg,
  } as ViewStyle,
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.lg,
  } as ViewStyle,
  greeting: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  streakMessage: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,
  section: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  } as ViewStyle,
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  } as ViewStyle,
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
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
