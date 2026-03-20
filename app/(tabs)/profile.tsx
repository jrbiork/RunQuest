import { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUserStore, selectWeeklyRunsTarget } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useStreak } from '../../src/hooks/useStreak';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { LevelBadge } from '../../src/components/ui/LevelBadge';
import { StreakBadge } from '../../src/components/ui/StreakBadge';
import { Button } from '../../src/components/ui/Button';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';
import { getLevelInfo, formatDistance } from '../../src/utils/xpCalculator';

const GOAL_LABELS: Record<string, string> = {
  habit: 'Build a habit',
  consistency: 'Run more consistently',
  distance: 'Improve distance',
  speed: 'Train for speed',
  race: 'Prepare for a race',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: '🌱 Beginner',
  intermediate: '🏃 Intermediate',
  advanced: '⚡ Advanced',
};

const LEVEL_TITLES = [
  'Rookie Runner', 'Pavement Pounder', 'Trail Blazer', 'Momentum Builder',
  'Endurance Seeker', 'Distance Chaser', 'Speed Demon', 'Race Ready',
  'Iron Legs', 'Ultramarathoner', 'Running Legend', 'Elite Pacer',
  'Marathon Master', 'Unstoppable', 'RunQuest Champion',
];

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const xp = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const totalDistanceKm = useUserStore((s) => s.totalDistanceKm);
  const longestStreak = useUserStore((s) => s.longestStreak);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const runsTarget = useUserStore(selectWeeklyRunsTarget);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);
  const levelInfo = useMemo(() => getLevelInfo(xp), [xp]);
  const generateWeek = useMissionsStore((s) => s.generateWeek);

  const { streak, isAlive, message: streakMessage } = useStreak();

  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const runsThisWeek = weeklyProgress?.runsCompleted ?? 0;
  const weekProgress = runsTarget > 0 ? Math.min(runsThisWeek / runsTarget, 1) : 0;

  const handleReset = () => {
    Alert.alert(
      'Reset RunQuest',
      'This will delete all your progress and restart onboarding. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  // Level milestones to show
  const milestones = LEVEL_TITLES.slice(0, Math.min(levelInfo.level + 2, LEVEL_TITLES.length));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + identity */}
        <View style={styles.heroSection}>
          <View style={styles.avatar}>
            <MaterialIcons name="directions-run" size={40} color={colors.primary} />
          </View>
          <View style={styles.identity}>
            <View style={styles.identityRow}>
              <LevelBadge level={levelInfo.level} size="md" />
              <Text style={styles.levelTitle}>{levelInfo.title}</Text>
            </View>
            <Text style={styles.xpTotal}>{xp.toLocaleString()} XP total</Text>
          </View>
        </View>

        {/* XP progress bar */}
        <Card style={styles.xpCard}>
          <View style={styles.xpCardHeader}>
            <Text style={styles.xpCardTitle}>Level Progress</Text>
            <Text style={styles.xpCardSub}>
              {levelInfo.xpInLevel} / {levelInfo.xpToNextLevel} XP → Level {levelInfo.level + 1}
            </Text>
          </View>
          <ProgressBar
            progress={levelInfo.progress}
            color={colors.blue}
            backgroundColor={colors.blueLight}
            height={10}
          />
        </Card>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatBlock label="Total Runs" value={totalRuns.toString()} icon="directions-run" iconColor={colors.primary} />
          <StatBlock label="Total Distance" value={formatDistance(totalDistanceKm)} icon="straighten" iconColor={colors.blue} />
          <StatBlock label="Current Streak" value={`${streak}d`} icon="local-fire-department" iconColor={colors.orange} />
          <StatBlock label="Best Streak" value={`${longestStreak}d`} icon="emoji-events" iconColor={colors.yellow} />
        </View>

        {/* Streak banner */}
        <Card style={styles.streakCard}>
          <StreakBadge streak={streak} isAlive={isAlive} size="lg" showLabel />
          <Text style={styles.streakMsg}>{streakMessage}</Text>
        </Card>

        {/* This week */}
        <Card style={styles.weekCard}>
          <View style={styles.weekHeader}>
            <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>This Week</Text>
          </View>
          <View style={styles.weekStats}>
            <Text style={styles.weekValue}>
              <Text style={styles.weekBold}>{runsThisWeek}</Text>
              <Text style={styles.weekDim}> / {runsTarget} runs</Text>
            </Text>
          </View>
          <ProgressBar
            progress={weekProgress}
            color={colors.primary}
            backgroundColor={colors.primaryLight}
            height={8}
          />
        </Card>

        {/* Profile details */}
        {profile && (
          <Card style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Your Profile</Text>
            <ProfileRow
              icon="fitness-center"
              label="Experience"
              value={EXPERIENCE_LABELS[profile.experienceLevel] ?? profile.experienceLevel}
            />
            <Divider />
            <ProfileRow
              icon="flag"
              label="Goal"
              value={GOAL_LABELS[profile.runningGoal] ?? profile.runningGoal}
            />
            <Divider />
            <ProfileRow
              icon="calendar-today"
              label="Run Days"
              value={profile.preferredDays.join(', ')}
            />
            <Divider />
            <ProfileRow
              icon="speed"
              label="Pace Level"
              value={profile.paceLevel.charAt(0).toUpperCase() + profile.paceLevel.slice(1)}
            />
          </Card>
        )}

        {/* Level milestones */}
        <Card style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>Level Journey</Text>
          {milestones.map((title, idx) => {
            const lvl = idx + 1;
            const isUnlocked = lvl <= levelInfo.level;
            const isCurrent = lvl === levelInfo.level;
            return (
              <View key={lvl} style={styles.milestoneRow}>
                <View style={[
                  styles.milestoneDot,
                  isUnlocked ? styles.milestoneDotDone : styles.milestoneDotLocked,
                  isCurrent && styles.milestoneDotCurrent,
                ]}>
                  {isUnlocked && <MaterialIcons name="check" size={12} color="#fff" />}
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneLvl, !isUnlocked && styles.textLocked]}>
                    Level {lvl}
                  </Text>
                  <Text style={[styles.milestoneTitle, !isUnlocked && styles.textLocked]}>
                    {title}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {/* Regenerate missions */}
        {profile && (
          <Button
            label="Regenerate This Week's Missions"
            onPress={() => {
              generateWeek(profile);
              Alert.alert('Done!', "Your weekly missions have been refreshed.");
            }}
            variant="secondary"
            fullWidth
          />
        )}

        {/* Reset */}
        <Button
          label="Reset & Restart Onboarding"
          onPress={handleReset}
          variant="danger"
          fullWidth
          style={styles.resetBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value, icon, iconColor }: { label: string; value: string; icon: string; iconColor: string }) {
  return (
    <View style={styles.statBlock}>
      <MaterialIcons name={icon as any} size={24} color={iconColor} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileRow}>
      <MaterialIcons name={icon as any} size={18} color={colors.textSecondary} />
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
    gap: spacing.lg,
  } as ViewStyle,

  // Hero
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
  } as ViewStyle,
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  } as ViewStyle,
  identity: {
    flex: 1,
    gap: spacing.sm,
  } as ViewStyle,
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  levelTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  xpTotal: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // XP card
  xpCard: {
    gap: spacing.md,
  } as ViewStyle,
  xpCardHeader: {
    gap: spacing.xs,
  } as ViewStyle,
  xpCardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  xpCardSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  } as ViewStyle,
  statBlock: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
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

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  } as ViewStyle,
  streakMsg: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  } as TextStyle,

  // Week card
  weekCard: {
    gap: spacing.md,
  } as ViewStyle,
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  weekStats: {} as ViewStyle,
  weekValue: {
    fontSize: fontSizes.md,
  } as TextStyle,
  weekBold: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  } as TextStyle,
  weekDim: {
    color: colors.textSecondary,
  } as TextStyle,

  // Profile details card
  profileCard: {
    gap: spacing.sm,
  } as ViewStyle,
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  profileLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    width: 90,
  } as TextStyle,
  profileValue: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    textAlign: 'right',
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,

  // Milestones
  milestonesCard: {
    gap: spacing.md,
  } as ViewStyle,
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  } as ViewStyle,
  milestoneDot: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  milestoneDotDone: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  milestoneDotCurrent: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  } as ViewStyle,
  milestoneDotLocked: {
    backgroundColor: colors.border,
  } as ViewStyle,
  milestoneContent: {
    flex: 1,
  } as ViewStyle,
  milestoneLvl: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  milestoneTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  } as TextStyle,
  textLocked: {
    color: colors.textTertiary,
  } as TextStyle,
  currentBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  } as ViewStyle,
  currentBadgeText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: fontWeights.bold,
  } as TextStyle,

  // Buttons
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  resetBtn: {
    marginTop: spacing.sm,
  } as ViewStyle,
});
