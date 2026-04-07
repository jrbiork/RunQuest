import { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useUserStore, MIN_EFFORT_SECONDS } from '../../src/store/userStore';
import { useMissionsStore } from '../../src/store/missionsStore';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  missionConfig,
} from '../../src/constants/theme';
import { calculateTimedMissionXp, formatDistance } from '../../src/utils/xpCalculator';
import { MISSION_IMPACT_MESSAGES, FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import RunShareCard from '../../src/components/share/RunShareCard';
import { shareCard } from '../../src/services/shareService';
import type { GpsPoint, Mission } from '../../src/types';
import { findMissionById, normalizeRouteParam } from '../../src/utils/missionLookup';
import { stripEmojis } from '../../src/utils/stripEmojis';
import { getStreakDayIndex0 } from '../../src/utils/streakDisplay';
import { getNextIncompleteMission } from '../../src/utils/missionGenerator';
import { ClassAndMissionProgress } from '../../src/components/progress/ClassAndMissionProgress';
import ViewShot from 'react-native-view-shot';

// ─── GPS stat tile ────────────────────────────────────────────────────────────

function GpsStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={gpsStyles.tile}>
      <MaterialIcons name={icon as any} size={16} color={color} />
      <Text style={gpsStyles.value}>{value}</Text>
      <Text style={gpsStyles.label}>{label}</Text>
    </View>
  );
}

const gpsStyles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: 4 } as ViewStyle,
  value: { fontSize: fontSizes.lg, fontWeight: fontWeights.extrabold, color: colors.textPrimary } as TextStyle,
  label: { fontSize: fontSizes.xs, color: colors.textSecondary, fontWeight: fontWeights.medium, textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
});

function shortenTitle(title: string, max = 32): string {
  const t = stripEmojis(title).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

// ─── Loot sparkles (theme colors, no confetti) ─────────────────────────────────

function LootSparkles({ visible }: { visible: boolean }) {
  const a = useSharedValue(0.35);
  useEffect(() => {
    if (!visible) return;
    a.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.35, { duration: 900 })),
      -1,
      true,
    );
  }, [visible, a]);
  const s1 = useAnimatedStyle(() => ({ opacity: a.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: a.value * 0.85 }));
  const s3 = useAnimatedStyle(() => ({ opacity: a.value * 0.7 }));
  if (!visible) return null;
  return (
    <View style={sparkleStyles.row}>
      <Animated.View style={[sparkleStyles.dot, { backgroundColor: colors.orange }, s1]} />
      <Animated.View style={[sparkleStyles.dot, { backgroundColor: colors.primary }, s2]} />
      <Animated.View style={[sparkleStyles.dot, { backgroundColor: colors.purple }, s3]} />
    </View>
  );
}

const sparkleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  } as ViewStyle,
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
});

// ─── XP reward with pop-in ───────────────────────────────────────────────────

function XpRewardBlock({
  isFreeRun,
  xpEarned,
  goalMet,
  partialTime,
}: {
  isFreeRun: boolean;
  xpEarned: number;
  goalMet: boolean;
  partialTime: boolean;
}) {
  const scale = useSharedValue(isFreeRun || !goalMet ? 1 : 0.88);
  useEffect(() => {
    if (!isFreeRun && goalMet) {
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    }
  }, [isFreeRun, goalMet, scale]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isFreeRun) {
    return (
      <Card style={styles.xpCard}>
        <View style={styles.xpRow}>
          <MaterialIcons name="self-improvement" size={28} color={colors.textSecondary} />
          <View style={styles.xpLeft}>
            <Text style={styles.xpLabel}>Free run</Text>
            <Text style={[styles.xpValue, styles.xpValueMuted]}>No XP this time</Text>
          </View>
        </View>
        <Text style={styles.xpMissionMessage}>
          Finish a mission to bank XP and push the story forward.
        </Text>
      </Card>
    );
  }

  if (!goalMet) {
    return (
      <Card style={styles.xpCard}>
        <View style={styles.xpRow}>
          <MaterialIcons name="block" size={28} color={colors.textTertiary} />
          <View style={styles.xpLeft}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={[styles.xpValue, { color: colors.textSecondary }]}>+0</Text>
          </View>
        </View>
        <Text style={styles.xpMissionMessage}>
          Hit the distance target to earn XP — on time for full base XP; go 30%+ over distance on
          time for +30% XP.
        </Text>
      </Card>
    );
  }

  if (partialTime) {
    return (
      <Card style={styles.xpCard} elevated accentTop={colors.orange}>
        <Animated.View style={[styles.xpRow, popStyle]}>
          <View style={styles.xpLeft}>
            <Text style={styles.xpLabel}>Partial XP</Text>
            <Text style={[styles.xpValue, { color: colors.orange }]}>+{xpEarned}</Text>
          </View>
          <View style={[styles.xpCircle, { borderColor: colors.orange }]}>
            <Text style={[styles.xpCircleText, { color: colors.orange }]}>+{xpEarned}</Text>
          </View>
        </Animated.View>
        <Text style={styles.xpMissionMessage}>
          Distance met after the time window — half XP. Beat the clock next time for full base XP (and
          30%+ over distance on time for +30% XP).
        </Text>
      </Card>
    );
  }

  return (
    <Card style={styles.xpCard} elevated accentTop={colors.purple}>
      <LootSparkles visible />
      <Animated.View style={[styles.xpRow, popStyle]}>
        <View style={styles.xpLeft}>
          <Text style={styles.xpLabel}>XP earned</Text>
          <Text style={[styles.xpValue, styles.xpValueDisplay]}>+{xpEarned}</Text>
        </View>
        <View style={styles.xpCircle}>
          <Text style={styles.xpCircleText}>+{xpEarned}</Text>
        </View>
      </Animated.View>
      <Text style={styles.xpMissionMessage}>
        Added to your runner profile — keep the streak alive for more. On-time with ≥30% distance over
        target earns +30% XP.
      </Text>
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RunCompleteScreen() {
  const rawParams =
    useLocalSearchParams<{
      id: string;
      distanceKm?: string;
      durationMin?: string;
      elapsedSec?: string;
      pathJson?: string;
      goalMet?: string;
      onTime?: string;
      activityMode?: string;
    }>();
  const id = normalizeRouteParam(rawParams.id);
  const distKmParam = normalizeRouteParam(rawParams.distanceKm as string | string[] | undefined);
  const durMinParam = normalizeRouteParam(rawParams.durationMin as string | string[] | undefined);
  const elapsedSecParam = normalizeRouteParam(rawParams.elapsedSec as string | string[] | undefined);
  const pathJson = normalizeRouteParam(rawParams.pathJson as string | string[] | undefined);
  const goalMetParam = normalizeRouteParam(rawParams.goalMet as string | string[] | undefined);
  const onTimeParam = normalizeRouteParam(rawParams.onTime as string | string[] | undefined);
  const activityModeParam = normalizeRouteParam(rawParams.activityMode as string | string[] | undefined);

  const actualDistanceKm = distKmParam ? parseFloat(distKmParam) : undefined;
  const actualDurationMin = durMinParam ? parseFloat(durMinParam) : undefined;
  const elapsedSec = elapsedSecParam ? parseFloat(elapsedSecParam) : undefined;
  const goalMet = goalMetParam === '1';
  const onTime = onTimeParam !== '0';
  const partialTime = goalMet && !onTime;
  const activityMode = activityModeParam === 'cycle' ? 'cycle' as const : 'run' as const;
  const gpsPath = useMemo<GpsPoint[]>(() => {
    if (!pathJson) return [];
    try { return JSON.parse(pathJson) as GpsPoint[]; } catch { return []; }
  }, [pathJson]);

  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const completeMission = useMissionsStore((s) => s.completeMission);
  const regenerateMissionsIfPromoted = useMissionsStore((s) => s.regenerateMissionsIfPromoted);

  const completeRun = useUserStore((s) => s.completeRun);
  const recordEffortFromElapsedSec = useUserStore((s) => s.recordEffortFromElapsedSec);
  const streak = useUserStore((s) => s.streak);
  const runHistory = useUserStore((s) => s.runHistory);

  const shareStreakDay = useMemo(() => {
    const last = runHistory[runHistory.length - 1];
    if (!last) return Math.max(0, streak - 1);
    return getStreakDayIndex0(last, runHistory);
  }, [runHistory, streak]);

  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun ? FUN_RUN_MISSION : findMissionById(weekMissions, id);
  const alreadyCompleted = useRef(false);

  const missionList = weekMissions;

  const xpEarned = useMemo(() => {
    if (!mission || isFreeRun) return 0;
    const targetKm =
      activityMode === 'cycle'
        ? mission.targetCyclingDistanceKm
        : mission.targetDistanceKm;
    const completionRatio =
      targetKm > 0 && actualDistanceKm !== undefined
        ? Math.min(actualDistanceKm / targetKm, 1)
        : 1;
    const distanceRatioVsTarget =
      targetKm > 0 && actualDistanceKm !== undefined
        ? actualDistanceKm / targetKm
        : undefined;
    if (!goalMet) {
      return calculateTimedMissionXp(mission.type, streak, 'incomplete', completionRatio);
    }
    const kind = onTime ? 'on_time' : 'late';
    return calculateTimedMissionXp(
      mission.type,
      streak,
      kind,
      completionRatio,
      distanceRatioVsTarget,
    );
  }, [mission, isFreeRun, actualDistanceKm, streak, goalMet, onTime, activityMode]);

  const nextMissionForCta = useMemo(() => {
    if (!mission) return null;
    if (!goalMet && !isFreeRun) return null;
    const adjusted =
      goalMet && !isFreeRun
        ? missionList.map((m) =>
            m.id === mission.id ? { ...m, status: 'completed' as const } : m,
          )
        : missionList;
    return getNextIncompleteMission(adjusted);
  }, [missionList, mission, goalMet, isFreeRun]);

  const allCompleteAfter = useMemo(() => {
    if (!mission) return false;
    const adjusted =
      goalMet && !isFreeRun
        ? missionList.map((m) =>
            m.id === mission.id ? { ...m, status: 'completed' as const } : m,
          )
        : missionList;
    return adjusted.length > 0 && adjusted.every((m) => m.status === 'completed');
  }, [missionList, mission, goalMet, isFreeRun]);

  const primaryCta = useMemo(() => {
    if (!mission) {
      return {
        label: 'View journey',
        onPress: () => router.replace('/(tabs)/journey'),
      };
    }
    if (!isFreeRun && !goalMet) {
      return {
        label: 'Retry mission',
        onPress: () => router.push({ pathname: '/run/[id]', params: { id: mission.id } }),
      };
    }
    if (allCompleteAfter) {
      return {
        label: 'View journey',
        onPress: () => router.replace('/(tabs)/journey'),
      };
    }
    if (nextMissionForCta) {
      const short = shortenTitle(nextMissionForCta.title, 28);
      return {
        label: isFreeRun ? `Next mission: ${short}` : `Next: ${short}`,
        onPress: () =>
          router.push({ pathname: '/run/[id]', params: { id: nextMissionForCta.id } }),
      };
    }
    return {
      label: 'View journey',
      onPress: () => router.replace('/(tabs)/journey'),
    };
  }, [isFreeRun, goalMet, allCompleteAfter, nextMissionForCta, mission]);

  useEffect(() => {
    if (!mission || alreadyCompleted.current) return;
    alreadyCompleted.current = true;

    if (isFreeRun) {
      if (elapsedSec != null && elapsedSec >= MIN_EFFORT_SECONDS) {
        recordEffortFromElapsedSec(elapsedSec);
      }
      return;
    }

    const xpBefore = useUserStore.getState().xp;
    const profile = useUserStore.getState().profile;

    if (goalMet) {
      completeMission(mission.id, xpEarned);
    }

    const targetKm =
      activityMode === 'cycle'
        ? mission.targetCyclingDistanceKm
        : mission.targetDistanceKm;

    completeRun(
      mission.id,
      mission.type,
      actualDistanceKm,
      actualDurationMin,
      gpsPath.length >= 2 ? gpsPath : undefined,
      goalMet,
      activityMode,
      elapsedSec,
      goalMet ? { onTime, targetDistanceKm: targetKm } : undefined,
    );

    const xpAfter = useUserStore.getState().xp;
    if (profile) {
      regenerateMissionsIfPromoted(profile, xpBefore, xpAfter);
    }
  }, []);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission not found.</Text>
          <Button label="Go to base" onPress={() => router.replace('/(tabs)')} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareCard(viewShotRef, {
        delayMs: gpsPath.length >= 2 ? 550 : 0,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const config = missionConfig[mission.type];

  const impactMessages = MISSION_IMPACT_MESSAGES[mission.type];
  const impactMsg = isFreeRun
    ? 'You ran for the joy of it. The world is better for it.'
    : impactMessages[Math.floor(Math.random() * impactMessages.length)] as string;

  const hasGpsData = actualDistanceKm !== undefined && actualDurationMin !== undefined;

  const outcomeLabel = isFreeRun
    ? 'Free run complete'
    : goalMet
      ? partialTime
        ? 'Mission partially completed'
        : 'Mission cleared'
      : 'Objective incomplete';

  const heroGradientColors = !isFreeRun && !goalMet
    ? ([colors.textTertiary + '55', colors.background] as const)
    : !isFreeRun && partialTime
      ? ([colors.orange + '55', colors.background] as const)
      : ([colors.primary + '44', colors.orange + '22'] as const);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.heroOuter}>
          <LinearGradient
            colors={heroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroInner}>
              <View style={[styles.missionTypePill, { backgroundColor: config.bgColor }]}>
                <MaterialIcons name={config.icon as any} size={12} color={config.color} />
                <Text style={[styles.missionTypeText, { color: config.color }]}>{config.label}</Text>
              </View>
              <Text style={[styles.missionCompleteLabel, !isFreeRun && !goalMet && styles.missionFailLabel]}>
                {outcomeLabel}
              </Text>
              <Text style={styles.missionTitle}>{stripEmojis(mission.title)}</Text>
              <Text style={styles.heroTagline} numberOfLines={2}>
                {impactMsg}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* GPS stats — this run */}
        {hasGpsData && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Card style={styles.gpsCard}>
              <Text style={styles.progressSectionLabel}>This run</Text>
              <View style={styles.gpsRow}>
                <GpsStat icon="straighten" label="Distance" value={formatDistance(actualDistanceKm!)} color={colors.textPrimary} />
                <View style={styles.gpsDivider} />
                <GpsStat icon="timer" label="Time" value={`${Math.round(actualDurationMin!)} min`} color={colors.orange} />
                <View style={styles.gpsDivider} />
                <GpsStat
                  icon="speed"
                  label="Pace"
                  value={actualDistanceKm! > 0.01 ? `${(actualDurationMin! / actualDistanceKm!).toFixed(1)} /km` : '–'}
                  color={colors.purple}
                />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Reward ladder: XP */}
        <Animated.View entering={FadeInDown.delay(140).duration(450)}>
          <XpRewardBlock
            isFreeRun={isFreeRun}
            xpEarned={xpEarned}
            goalMet={goalMet}
            partialTime={partialTime}
          />
        </Animated.View>

        {/* Streak — success */}
        {!isFreeRun && goalMet && streak > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Card style={styles.streakCard} accentTop={colors.orange}>
              <MaterialIcons name="local-fire-department" size={32} color={colors.orange} />
              <View style={styles.streakInfo}>
                <Text style={styles.streakTitle}>
                  {streak === 1 ? 'Streak started' : `Day ${streak} streak`}
                </Text>
                <Text style={styles.streakSub}>
                  Come back tomorrow to keep the fire going.
                </Text>
              </View>
              <Text style={styles.streakCount}>{streak}</Text>
            </Card>
          </Animated.View>
        )}

        {/* Streak — failure (encouragement) */}
        {!isFreeRun && !goalMet && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <Card style={styles.streakCard}>
              <MaterialIcons name="local-fire-department" size={32} color={colors.orange} />
              <View style={styles.streakInfo}>
                <Text style={styles.streakTitle}>
                  {streak === 0
                    ? 'Streak'
                    : streak === 1
                      ? 'Streak alive'
                      : `Day ${streak} streak`}
                </Text>
                <Text style={styles.streakSub}>
                  {streak <= 1 ? 'The world starts healing today.' : 'Keep running. Keep rebuilding.'}
                </Text>
              </View>
              <Text style={styles.streakCount}>{streak > 0 ? streak : '—'}</Text>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <ClassAndMissionProgress />
        </Animated.View>

        {/* What’s next */}
        <Animated.View entering={FadeInDown.delay(360).duration(400)} style={styles.nextSection}>
          <Text style={styles.nextSectionLabel}>What&apos;s next</Text>
          <Text style={styles.nextSectionHint}>
            {!isFreeRun && !goalMet
              ? 'Jump back in — your route is ready when you are.'
              : allCompleteAfter
                ? 'You cleared the board. Review the path or take a breather.'
                : nextMissionForCta
                  ? 'Line up the next objective while momentum is high.'
                  : 'Head to the journey map to see what unlocks next.'}
          </Text>
          <Button
            label={primaryCta.label}
            onPress={primaryCta.onPress}
            variant="primary"
            fullWidth
          />
        </Animated.View>

        {/* Secondary actions */}
        <Animated.View entering={FadeInDown.delay(420).duration(400)} style={styles.ctaGroup}>
          <Button
            label={isSharing ? 'Preparing…' : 'Share run'}
            icon={isSharing ? undefined : 'ios-share'}
            onPress={handleShare}
            variant="secondary"
            fullWidth
          />
          <Button
            label="See journey"
            onPress={() => router.replace('/(tabs)/journey')}
            variant="ghost"
            fullWidth
          />
          {!isFreeRun && !goalMet && (
            <Button
              label="Browse missions"
              onPress={() => router.replace('/(tabs)')}
              variant="ghost"
              fullWidth
            />
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.offscreen} pointerEvents="none">
        <RunShareCard
          ref={viewShotRef}
          distanceKm={actualDistanceKm ?? mission.targetDistanceKm}
          durationMin={actualDurationMin ?? mission.targetDurationMin}
          xpEarned={xpEarned}
          streakDay={shareStreakDay}
          missionType={mission.type}
          path={gpsPath.length >= 2 ? gpsPath : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  scroll: { flex: 1 } as ViewStyle,
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  } as ViewStyle,
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.lg, padding: spacing.xl,
  } as ViewStyle,
  errorText: { fontSize: fontSizes.md, color: colors.textSecondary } as TextStyle,

  heroOuter: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  heroGradient: {
    borderRadius: radii.xl,
  } as ViewStyle,
  heroInner: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevated,
  } as ViewStyle,
  missionTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  } as ViewStyle,
  missionTypeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  missionCompleteLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,
  missionFailLabel: {
    color: colors.red,
  } as TextStyle,
  missionTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  } as TextStyle,
  heroTagline: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: fontWeights.medium,
    marginTop: spacing.xs,
  } as TextStyle,

  progressSectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,

  gpsCard: { gap: spacing.md } as ViewStyle,
  gpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' } as ViewStyle,
  gpsDivider: { width: 1, height: 36, backgroundColor: colors.border } as ViewStyle,

  xpCard: { gap: spacing.md } as ViewStyle,
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  xpLeft: { gap: spacing.xs } as ViewStyle,
  xpLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as TextStyle,
  xpValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.purple } as TextStyle,
  xpValueDisplay: { fontSize: fontSizes.display, fontWeight: fontWeights.extrabold } as TextStyle,
  xpValueMuted: { fontSize: fontSizes.xl, color: colors.textSecondary } as TextStyle,
  xpCircle: {
    width: 56, height: 56, borderRadius: radii.full,
    backgroundColor: colors.purpleLight, alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  xpCircleText: { fontSize: fontSizes.sm, fontWeight: fontWeights.extrabold, color: colors.purple } as TextStyle,
  xpMissionMessage: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,

  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as ViewStyle,
  streakInfo: { flex: 1, gap: spacing.xs } as ViewStyle,
  streakTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.textPrimary } as TextStyle,
  streakSub: { fontSize: fontSizes.sm, color: colors.textSecondary } as TextStyle,
  streakCount: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.orange } as TextStyle,

  nextSection: { gap: spacing.md } as ViewStyle,
  nextSectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  nextSectionHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,

  ctaGroup: { gap: spacing.md } as ViewStyle,

  offscreen: { position: 'absolute', left: -9999, top: -9999, opacity: 0 } as ViewStyle,
});
