import { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useUserStore } from '../../src/store/userStore';
import { useMissionsStore, selectAllComplete } from '../../src/store/missionsStore';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { LevelBadge } from '../../src/components/ui/LevelBadge';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
} from '../../src/constants/theme';
import { calculateXpEarned, getLevelInfo, formatDistance } from '../../src/utils/xpCalculator';
import { MISSION_TEMPLATES } from '../../src/constants/missions';
import RunShareCard from '../../src/components/share/RunShareCard';
import { shareCard } from '../../src/services/shareService';
import type { GpsPoint } from '../../src/types';
import ViewShot from 'react-native-view-shot';

// Confetti dot
function ConfettiDot({
  delay,
  color,
  startX,
}: {
  delay: number;
  color: string;
  startX: number;
}) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(-80, { duration: 600, easing: Easing.out(Easing.quad) }),
        withTiming(20, { duration: 400, easing: Easing.in(Easing.quad) }),
      ),
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(700, withTiming(0, { duration: 300 })),
      ),
    );
  }, [delay, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiDot,
        { backgroundColor: color, left: startX },
        style,
      ]}
    />
  );
}

function GpsStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={gpsStatStyles.tile}>
      <MaterialIcons name={icon as any} size={16} color={color} />
      <Text style={gpsStatStyles.value}>{value}</Text>
      <Text style={gpsStatStyles.label}>{label}</Text>
    </View>
  );
}

const gpsStatStyles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: 4 } as ViewStyle,
  value: { fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.textPrimary } as TextStyle,
  label: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: fontWeights.medium } as TextStyle,
});

export default function RunCompleteScreen() {
  const { id, distanceKm: distKmParam, durationMin: durMinParam, pathJson, goalMet: goalMetParam } =
    useLocalSearchParams<{ id: string; distanceKm?: string; durationMin?: string; pathJson?: string; goalMet?: string }>();

  const actualDistanceKm = distKmParam ? parseFloat(distKmParam) : undefined;
  const actualDurationMin = durMinParam ? parseFloat(durMinParam) : undefined;
  const goalMet = goalMetParam === '1';
  const gpsPath = useMemo<GpsPoint[]>(() => {
    if (!pathJson) return [];
    try { return JSON.parse(pathJson) as GpsPoint[]; } catch { return []; }
  }, [pathJson]);

  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completeMission = useMissionsStore((s) => s.completeMission);
  const allComplete = useMissionsStore(selectAllComplete);

  const completeRun = useUserStore((s) => s.completeRun);
  const markWeeklyBonus = useUserStore((s) => s.markWeeklyBonusAwarded);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const streak = useUserStore((s) => s.streak);
  const xpBefore = useUserStore((s) => s.xp);
  const levelInfoAfter = useMemo(() => getLevelInfo(xpBefore), [xpBefore]);

  const mission = weekMissions.find((m) => m.id === id);
  const alreadyCompleted = useRef(false);

  useEffect(() => {
    if (!mission || alreadyCompleted.current) return;
    alreadyCompleted.current = true;

    completeMission(mission.id);
    completeRun(mission.id, mission.type, actualDistanceKm, actualDurationMin, gpsPath.length >= 2 ? gpsPath : undefined, goalMet);

    // Award weekly bonus if all missions will be complete
    const updated = weekMissions.filter((m) => m.status === 'completed').length + 1;
    if (updated === weekMissions.length && !(weeklyProgress?.bonusXpAwarded)) {
      markWeeklyBonus();
    }
  }, []);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Oops — mission not found.</Text>
          <Button label="Back to Home" onPress={() => router.replace('/(tabs)')} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareCard(viewShotRef);
    } finally {
      setIsSharing(false);
    }
  };

  const template = MISSION_TEMPLATES[mission.type];
  const xpEarned = calculateXpEarned(mission.type, streak);
  const completionMessage = template.completionMessages[
    Math.floor(Math.random() * template.completionMessages.length)
  ] as string;

  const hasGpsData = actualDistanceKm !== undefined && actualDurationMin !== undefined;

  const newStreak = streak + 1;
  const weeklyRunsCompleted = (weeklyProgress?.runsCompleted ?? 0) + 1;
  const weeklyRunsTarget = 3; // will be overridden from profile but safe fallback
  const weeklyProg = Math.min(weeklyRunsCompleted / Math.max(weeklyRunsTarget, 1), 1);

  const confettiColors = [
    colors.primary, colors.orange, colors.purple, colors.blue, colors.yellow,
  ];
  const confettiDots = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 80,
    color: confettiColors[i % confettiColors.length] as string,
    startX: 20 + (i * 28),
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Celebration header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.celebration}>
          {/* Confetti */}
          <View style={styles.confettiContainer}>
            {confettiDots.map((dot, i) => (
              <ConfettiDot key={i} {...dot} />
            ))}
          </View>

          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.celebrationEmojiWrap}>
            <MaterialIcons name="celebration" size={64} color={colors.primary} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={styles.celebrationTitle}>
            Mission Complete!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(400).duration(400)} style={styles.celebrationMessage}>
            {completionMessage}
          </Animated.Text>
        </Animated.View>

        {/* GPS run stats — only shown when real tracking data is available */}
        {hasGpsData && (
          <Animated.View entering={FadeInDown.delay(480).duration(400)}>
            <Card style={styles.gpsCard}>
              <View style={styles.gpsRow}>
                <GpsStat
                  icon="straighten"
                  label="Distance"
                  value={formatDistance(actualDistanceKm!)}
                  color={colors.blue}
                />
                <View style={styles.gpsDivider} />
                <GpsStat
                  icon="timer"
                  label="Duration"
                  value={`${Math.round(actualDurationMin!)} min`}
                  color={colors.orange}
                />
                <View style={styles.gpsDivider} />
                <GpsStat
                  icon="speed"
                  label="Pace"
                  value={
                    actualDistanceKm! > 0.01
                      ? `${(actualDurationMin! / actualDistanceKm!).toFixed(1)} min/km`
                      : '–'
                  }
                  color={colors.purple}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* XP earned */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Card style={styles.xpCard} elevated>
            <View style={styles.xpRow}>
              <View style={styles.xpLeft}>
                <Text style={styles.xpLabel}>XP Earned</Text>
                <Text style={styles.xpValue}>+{xpEarned} XP</Text>
              </View>
              <View style={[styles.xpCircle]}>
                <Text style={styles.xpCircleText}>+{xpEarned}</Text>
              </View>
            </View>
            <ProgressBar
              progress={levelInfoAfter.progress}
              color={colors.purple}
              backgroundColor={colors.purpleLight}
              height={6}
            />
            <View style={styles.levelRow}>
              <LevelBadge level={levelInfoAfter.level} size="sm" />
              <Text style={styles.levelText}>{levelInfoAfter.title}</Text>
              <Text style={styles.levelXpText}>
                {levelInfoAfter.xpInLevel}/{levelInfoAfter.xpToNextLevel} XP
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Streak */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)}>
          <Card style={styles.streakCard}>
            <MaterialIcons name="local-fire-department" size={32} color={colors.orange} />
            <View style={styles.streakInfo}>
              <Text style={styles.streakTitle}>
                {streak === 0 ? 'Streak started!' : `Streak extended to ${newStreak} days!`}
              </Text>
              <Text style={styles.streakSub}>
                {streak === 0
                  ? "Day 1. Don't break it tomorrow."
                  : "Keep it going — you're unstoppable."}
              </Text>
            </View>
            <Text style={styles.streakCount}>{newStreak}</Text>
          </Card>
        </Animated.View>

        {/* Weekly goal */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <Card style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
              <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
              <Text style={styles.weeklyTitle}>Weekly Goal</Text>
            </View>
            <ProgressBar
              progress={weeklyProg}
              color={colors.primary}
              backgroundColor={colors.primaryLight}
              height={8}
            />
            <Text style={styles.weeklyText}>
              {weeklyRunsCompleted} run{weeklyRunsCompleted !== 1 ? 's' : ''} this week
            </Text>
          </Card>
        </Animated.View>

        {/* Mission details */}
        <Animated.View entering={FadeInDown.delay(800).duration(400)}>
          <View style={styles.missionSummary}>
            <MaterialIcons name="check-circle" size={20} color={colors.primary} />
            <Text style={styles.missionSummaryText}>
              <Text style={styles.missionSummaryBold}>{mission.title}</Text>
              {' '}— {mission.type} run complete
            </Text>
          </View>
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInDown.delay(900).duration(400)} style={styles.ctaGroup}>
          <Button
            label={isSharing ? 'Preparing…' : 'Share Run'}
            icon={isSharing ? undefined : 'ios-share'}
            onPress={handleShare}
            variant="secondary"
            fullWidth
          />
          <Button
            label="Back to Journey"
            onPress={() => router.replace('/(tabs)/journey')}
            fullWidth
          />
          <Button
            label="Go Home"
            onPress={() => router.replace('/(tabs)')}
            variant="ghost"
            fullWidth
          />
        </Animated.View>
      </ScrollView>

      {/* Off-screen share card — rendered but invisible, captured by viewShot */}
      <View style={styles.offscreen} pointerEvents="none">
        <RunShareCard
          ref={viewShotRef}
          distanceKm={actualDistanceKm ?? mission.targetDistanceKm}
          durationMin={actualDurationMin ?? mission.targetDurationMin}
          xpEarned={xpEarned}
          streakDay={newStreak}
          missionType={mission.type}
          path={gpsPath.length >= 2 ? gpsPath : undefined}
        />
      </View>
    </SafeAreaView>
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  } as ViewStyle,
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  } as ViewStyle,
  errorText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  } as TextStyle,

  // Celebration
  celebration: {
    alignItems: 'center',
    position: 'relative',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  } as ViewStyle,
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    overflow: 'hidden',
  } as ViewStyle,
  confettiDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: radii.full,
    top: 60,
  } as ViewStyle,
  celebrationEmojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  celebrationTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
  } as TextStyle,
  celebrationMessage: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  } as TextStyle,

  // XP Card
  xpCard: {
    gap: spacing.md,
  } as ViewStyle,
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  xpLeft: {
    gap: spacing.xs,
  } as ViewStyle,
  xpLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  } as TextStyle,
  xpValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.purple,
  } as TextStyle,
  xpCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  xpCircleText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.purple,
  } as TextStyle,
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  levelText: {
    flex: 1,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  } as TextStyle,
  levelXpText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  } as TextStyle,

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } as ViewStyle,
  streakInfo: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  streakTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  streakSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,
  streakCount: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
  } as TextStyle,

  // Weekly
  weeklyCard: {
    gap: spacing.md,
  } as ViewStyle,
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  weeklyTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,
  weeklyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Mission summary
  missionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  } as ViewStyle,
  missionSummaryText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.primaryDark,
    lineHeight: 20,
  } as TextStyle,
  missionSummaryBold: {
    fontWeight: fontWeights.bold,
  } as TextStyle,

  // CTAs
  ctaGroup: {
    gap: spacing.md,
    marginTop: spacing.sm,
  } as ViewStyle,

  // Off-screen capture container
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
  } as ViewStyle,

  // GPS stats card
  gpsCard: {} as ViewStyle,
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  } as ViewStyle,
  gpsDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  } as ViewStyle,
});
