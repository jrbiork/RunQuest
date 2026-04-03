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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useUserStore, MIN_EFFORT_SECONDS } from '../../src/store/userStore';
import { useMissionsStore, selectAllComplete } from '../../src/store/missionsStore';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { LevelBadge } from '../../src/components/ui/LevelBadge';
import { CityRestoreAnimation } from '../../src/components/run/CityRestoreAnimation';
import { ZoneMapAnimation } from '../../src/components/run/ZoneMapAnimation';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  missionConfig,
} from '../../src/constants/theme';
import { calculateXpEarned, getLevelInfo, formatDistance } from '../../src/utils/xpCalculator';
import { MISSION_TEMPLATES, MISSION_IMPACT_MESSAGES, FUN_RUN_ID, FUN_RUN_MISSION } from '../../src/constants/missions';
import RunShareCard from '../../src/components/share/RunShareCard';
import { shareCard } from '../../src/services/shareService';
import type { GpsPoint } from '../../src/types';
import { findMissionById, normalizeRouteParam } from '../../src/utils/missionLookup';
import { stripEmojis } from '../../src/utils/stripEmojis';
import { getStreakDayIndex0 } from '../../src/utils/streakDisplay';
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
      activityMode?: string;
    }>();
  const id = normalizeRouteParam(rawParams.id);
  const distKmParam = normalizeRouteParam(rawParams.distanceKm as string | string[] | undefined);
  const durMinParam = normalizeRouteParam(rawParams.durationMin as string | string[] | undefined);
  const elapsedSecParam = normalizeRouteParam(rawParams.elapsedSec as string | string[] | undefined);
  const pathJson = normalizeRouteParam(rawParams.pathJson as string | string[] | undefined);
  const goalMetParam = normalizeRouteParam(rawParams.goalMet as string | string[] | undefined);
  const activityModeParam = normalizeRouteParam(rawParams.activityMode as string | string[] | undefined);

  const actualDistanceKm = distKmParam ? parseFloat(distKmParam) : undefined;
  const actualDurationMin = durMinParam ? parseFloat(durMinParam) : undefined;
  const elapsedSec = elapsedSecParam ? parseFloat(elapsedSecParam) : undefined;
  const goalMet = goalMetParam === '1';
  const activityMode = activityModeParam === 'cycle' ? 'cycle' as const : 'run' as const;
  const gpsPath = useMemo<GpsPoint[]>(() => {
    if (!pathJson) return [];
    try { return JSON.parse(pathJson) as GpsPoint[]; } catch { return []; }
  }, [pathJson]);

  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const completeMission = useMissionsStore((s) => s.completeMission);
  const failMission = useMissionsStore((s) => s.failMission);
  const allComplete = useMissionsStore(selectAllComplete);

  const completeRun = useUserStore((s) => s.completeRun);
  const recordEffortFromElapsedSec = useUserStore((s) => s.recordEffortFromElapsedSec);
  const markWeeklyBonus = useUserStore((s) => s.markWeeklyBonusAwarded);
  const weeklyProgress = useUserStore((s) => s.weeklyProgress);
  const streak = useUserStore((s) => s.streak);
  const runHistory = useUserStore((s) => s.runHistory);
  const xpBefore = useUserStore((s) => s.xp);
  const totalRuns = useUserStore((s) => s.totalRuns);
  const levelInfoAfter = useMemo(() => getLevelInfo(xpBefore), [xpBefore]);

  const shareStreakDay = useMemo(() => {
    const last = runHistory[runHistory.length - 1];
    if (!last) return Math.max(0, streak - 1);
    return getStreakDayIndex0(last, runHistory);
  }, [runHistory, streak]);

  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun ? FUN_RUN_MISSION : findMissionById(campaignMissions, weekMissions, id);
  const alreadyCompleted = useRef(false);

  useEffect(() => {
    if (!mission || alreadyCompleted.current) return;
    alreadyCompleted.current = true;

    if (isFreeRun) {
      if (elapsedSec != null && elapsedSec >= MIN_EFFORT_SECONDS) {
        recordEffortFromElapsedSec(elapsedSec);
      }
      return;
    }

    if (goalMet) {
      completeMission(mission.id, xpEarned);
    } else {
      failMission(mission.id);
    }
    completeRun(
      mission.id,
      mission.type,
      actualDistanceKm,
      actualDurationMin,
      gpsPath.length >= 2 ? gpsPath : undefined,
      goalMet,
      activityMode,
      elapsedSec,
    );

    const allMissions = campaignMissions.length > 0 ? campaignMissions : weekMissions;
    const updated = allMissions.filter((m) => m.status === 'completed').length + (goalMet ? 1 : 0);
    if (updated === allMissions.length && !(weeklyProgress?.bonusXpAwarded)) {
      markWeeklyBonus();
    }
  }, []);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission not found.</Text>
          <Button label="Back to Base" onPress={() => router.replace('/(tabs)')} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    setIsSharing(true);
    try { await shareCard(viewShotRef); } finally { setIsSharing(false); }
  };

  const template = MISSION_TEMPLATES[mission.type];
  const completionRatio = (!isFreeRun && mission.targetDistanceKm > 0 && actualDistanceKm !== undefined)
    ? actualDistanceKm / mission.targetDistanceKm
    : 1;
  const xpEarned = isFreeRun ? 0 : calculateXpEarned(mission.type, streak, completionRatio);
  const config = missionConfig[mission.type];

  // Impact message
  const impactMessages = MISSION_IMPACT_MESSAGES[mission.type];
  const impactMsg = isFreeRun
    ? 'You ran for the joy of it. The world is better for it.'
    : impactMessages[Math.floor(Math.random() * impactMessages.length)] as string;

  // World restoration stats
  const zonesOnline = Math.min(Math.floor(totalRuns / 1.5) + 1, 12);
  const worldRestoredPct = Math.min(Math.round(totalRuns * 4), 100);

  const hasGpsData = actualDistanceKm !== undefined && actualDurationMin !== undefined;
  const weeklyRunsCompleted = weeklyProgress?.runsCompleted ?? 0;
  const weeklyRunsTarget = 3;
  const weeklyProg = Math.min(weeklyRunsCompleted / Math.max(weeklyRunsTarget, 1), 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── MISSION COMPLETE header ─────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <View style={[styles.missionTypePill, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={config.icon as any} size={12} color={config.color} />
            <Text style={[styles.missionTypeText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={[styles.missionCompleteLabel, !isFreeRun && !goalMet && styles.missionFailLabel]}>
            {isFreeRun ? 'FREE RUN COMPLETE' : goalMet ? 'MISSION COMPLETE' : 'MISSION FAILED'}
          </Text>
          <Text style={styles.missionTitle}>{stripEmojis(mission.title)}</Text>
        </Animated.View>

        {/* ── City restoration animation ──────────────────────────────── */}
        <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.cityWrap}>
          <CityRestoreAnimation />
          <Text style={styles.cityCaption}>{impactMsg}</Text>
        </Animated.View>

        {/* ── Zone map ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.zoneWrap}>
          <ZoneMapAnimation zonesOnline={zonesOnline} totalZones={12} />
        </Animated.View>

        {/* ── World restoration progress — hidden for free run ──────────── */}
        {!isFreeRun && (
          <Animated.View entering={FadeInDown.delay(800).duration(400)}>
            <Card style={styles.worldCard}>
              <View style={styles.worldHeader}>
                <MaterialIcons name="public" size={16} color={colors.primary} />
                <Text style={styles.worldTitle}>World Restoration</Text>
                <Text style={styles.worldPct}>{worldRestoredPct}%</Text>
              </View>
              <ProgressBar
                progress={worldRestoredPct / 100}
                color={colors.primary}
                backgroundColor={colors.primaryLight}
                height={6}
              />
              <Text style={styles.worldSub}>
                {goalMet
                  ? 'Zone fully restored. Another victory for the Runners.'
                  : 'MISSION FAILED — Zone lost. Retry the mission to recover it.'}
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* ── GPS run stats ─────────────────────────────────────────────── */}
        {hasGpsData && (
          <Animated.View entering={FadeInDown.delay(900).duration(400)}>
            <Card style={styles.gpsCard}>
              <View style={styles.gpsRow}>
                <GpsStat icon="straighten" label="Distance" value={formatDistance(actualDistanceKm!)} color={colors.blue} />
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

        {/* ── XP earned ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(950).duration(400)}>
          {isFreeRun ? (
            <Card style={styles.xpCard}>
              <View style={styles.xpRow}>
                <MaterialIcons name="self-improvement" size={28} color={colors.textSecondary} />
                <View style={styles.xpLeft}>
                  <Text style={styles.xpLabel}>Free Run</Text>
                  <Text style={[styles.xpValue, { color: colors.textSecondary }]}>No XP earned</Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card style={styles.xpCard} elevated>
              <View style={styles.xpRow}>
                <View style={styles.xpLeft}>
                  <Text style={styles.xpLabel}>XP Earned</Text>
                  <Text style={styles.xpValue}>+{xpEarned} XP</Text>
                </View>
                <View style={styles.xpCircle}>
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
          )}
        </Animated.View>

        {/* ── Streak — failed missions only (hidden on successful completion) ─ */}
        {!isFreeRun && !goalMet && (
          <Animated.View entering={FadeInDown.delay(1000).duration(400)}>
            <Card style={styles.streakCard}>
              <MaterialIcons name="local-fire-department" size={32} color={colors.orange} />
              <View style={styles.streakInfo}>
                <Text style={styles.streakTitle}>
                  {streak === 0
                    ? 'Streak'
                    : streak === 1
                      ? 'Streak started!'
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

        {/* ── Weekly goal ──────────────────────────────────────────────── */}
        {!isFreeRun && (
          <Animated.View entering={FadeInDown.delay(1050).duration(400)}>
            <Card style={styles.weeklyCard}>
              <View style={styles.weeklyHeader}>
                <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
                <Text style={styles.weeklyTitle}>Weekly Ops</Text>
              </View>
              <ProgressBar
                progress={weeklyProg}
                color={colors.primary}
                backgroundColor={colors.primaryLight}
                height={8}
              />
              <Text style={styles.weeklyText}>
                {weeklyRunsCompleted} mission{weeklyRunsCompleted !== 1 ? 's' : ''} completed this week
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(1100).duration(400)} style={styles.ctaGroup}>
          <Button
            label={isSharing ? 'Preparing…' : 'Share Run'}
            icon={isSharing ? undefined : 'ios-share'}
            onPress={handleShare}
            variant="secondary"
            fullWidth
          />
          <Button
            label="Back to Base"
            onPress={() => router.replace('/(tabs)/journey')}
            fullWidth
          />
          {!isFreeRun && !goalMet && (
            <Button
              label="Mission Control"
              onPress={() => router.replace('/(tabs)')}
              variant="ghost"
              fullWidth
            />
          )}
        </Animated.View>
      </ScrollView>

      {/* Off-screen share card */}
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  } as ViewStyle,
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.lg, padding: spacing.xl,
  } as ViewStyle,
  errorText: { fontSize: fontSizes.md, color: colors.textSecondary } as TextStyle,

  // Header
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
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
    letterSpacing: 4,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // City animation wrapper
  cityWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  cityCaption: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.3,
  } as TextStyle,

  // Zone map wrapper
  zoneWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  } as ViewStyle,

  // World card
  worldCard: { gap: spacing.md } as ViewStyle,
  worldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  worldTitle: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  } as TextStyle,
  worldPct: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
  } as TextStyle,
  worldSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  } as TextStyle,

  // GPS stats
  gpsCard: {} as ViewStyle,
  gpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' } as ViewStyle,
  gpsDivider: { width: 1, height: 36, backgroundColor: colors.border } as ViewStyle,

  // XP
  xpCard: { gap: spacing.md } as ViewStyle,
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as ViewStyle,
  xpLeft: { gap: spacing.xs } as ViewStyle,
  xpLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: fontWeights.medium } as TextStyle,
  xpValue: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.purple } as TextStyle,
  xpCircle: {
    width: 56, height: 56, borderRadius: radii.full,
    backgroundColor: colors.purpleLight, alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  xpCircleText: { fontSize: fontSizes.sm, fontWeight: fontWeights.extrabold, color: colors.purple } as TextStyle,
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as ViewStyle,
  levelText: { flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textPrimary } as TextStyle,
  levelXpText: { fontSize: fontSizes.xs, color: colors.textSecondary } as TextStyle,

  // Streak
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } as ViewStyle,
  streakInfo: { flex: 1, gap: spacing.xs } as ViewStyle,
  streakTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.textPrimary } as TextStyle,
  streakSub: { fontSize: fontSizes.sm, color: colors.textSecondary } as TextStyle,
  streakCount: { fontSize: fontSizes.xxl, fontWeight: fontWeights.extrabold, color: colors.orange } as TextStyle,

  // Weekly
  weeklyCard: { gap: spacing.md } as ViewStyle,
  weeklyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as ViewStyle,
  weeklyTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.textPrimary } as TextStyle,
  weeklyText: { fontSize: fontSizes.sm, color: colors.textSecondary } as TextStyle,

  // CTAs
  ctaGroup: { gap: spacing.md, marginTop: spacing.sm } as ViewStyle,

  // Off-screen
  offscreen: { position: 'absolute', left: -9999, top: -9999, opacity: 0 } as ViewStyle,
});
