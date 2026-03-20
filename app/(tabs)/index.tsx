import { useEffect, useMemo } from 'react';
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
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useUserStore, selectWeeklyRunsTarget, selectWeeklyDistanceTarget } from '../../src/store/userStore';
import { getLevelInfo } from '../../src/utils/xpCalculator';
import { useMissionsStore, selectTodaysMission } from '../../src/store/missionsStore';
import { useStreak } from '../../src/hooks/useStreak';
import { DailyMissionCard } from '../../src/components/home/DailyMissionCard';
import { WeeklyProgressCard } from '../../src/components/home/WeeklyProgressCard';
import { LevelProgressCard } from '../../src/components/home/LevelProgressCard';
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

  const todaysMission = useMissionsStore(selectTodaysMission);
  const refreshMissions = useMissionsStore((s) => s.refreshIfNewWeek);

  const { streak } = useStreak();

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
    refreshMissions(profile);
  }, []);

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
              if (profile) refreshMissions(profile);
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
            label="Total Runs"
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
          />
        </View>

        {/* ─── Level Progress ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.accentBar} />
            <Text style={styles.sectionTitle}>Rank Progress</Text>
          </View>
          <LevelProgressCard levelInfo={levelInfo} />
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
