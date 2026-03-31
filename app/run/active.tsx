import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useMissionsStore } from '../../src/store/missionsStore';
import { useRunSessionStore } from '../../src/store/runSessionStore';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { colors, spacing, radii, fontSizes, fontWeights, shadows, missionConfig } from '../../src/constants/theme';
import { formatDistance } from '../../src/utils/xpCalculator';
import { formatElapsed, formatPace } from '../../src/utils/haversine';
import { useGpsTracking } from '../../src/hooks/useGpsTracking';
import { playGoalReachedSound, speakRunCue } from '../../src/services/audioService';
import { scheduleGoalReachedNotification } from '../../src/services/notificationService';
import { MISSION_AUDIO_CUES, FUN_RUN_ID, FUN_RUN_MISSION, pickCue } from '../../src/constants/missions';
import { findMissionById, normalizeRouteParam } from '../../src/utils/missionLookup';
import type { ActivityMode } from '../../src/types';

export default function ActiveRunScreen() {
  const params = useLocalSearchParams<{ id: string; activityMode?: string }>();
  const id = normalizeRouteParam(params.id);
  const activityModeParam = normalizeRouteParam(params.activityMode);
  const activityMode: ActivityMode = activityModeParam === 'cycle' ? 'cycle' : 'run';

  const campaignMissions = useMissionsStore((s) => s.campaignMissions);
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const failMission = useMissionsStore((s) => s.failMission);
  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun ? FUN_RUN_MISSION : findMissionById(campaignMissions, weekMissions, id);
  const setRunActive = useRunSessionStore((s) => s.setRunActive);
  const { path, distanceKm, elapsedSec, isTracking, isPaused, hasPermission, start, stop, pause, resume } =
    useGpsTracking();

  // Determine targets based on activity mode
  const targetDistanceKm = isFreeRun
    ? 0
    : activityMode === 'cycle'
    ? (mission?.targetCyclingDistanceKm ?? 0)
    : (mission?.targetDistanceKm ?? 0);
  const targetDurationMin = isFreeRun
    ? 0
    : activityMode === 'cycle'
    ? (mission?.targetCyclingDurationMin ?? 0)
    : (mission?.targetDurationMin ?? 0);

  const goalReachedFired = useRef(false);
  const startCueFired = useRef(false);
  const milestone25Fired = useRef(false);
  const milestone50Fired = useRef(false);
  const milestone75Fired = useRef(false);
  const mapRef = useRef<MapView>(null);

  // Reanimated values for goal-reached banner
  const bannerScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const triggerGoalReached = useCallback(async (missionTitle: string) => {
    bannerScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    await Promise.all([
      playGoalReachedSound(),
      scheduleGoalReachedNotification(missionTitle),
    ]);
  }, [bannerScale, pulseOpacity]);

  useEffect(() => {
    setRunActive(true);
    return () => setRunActive(false);
  }, [setRunActive]);

  useEffect(() => {
    start();
  }, [start]);

  // 2-second start cue (skip for free run — no narrative)
  useEffect(() => {
    if (!mission || !isTracking || isFreeRun || startCueFired.current) return;
    const cues = MISSION_AUDIO_CUES[mission.type];
    const timer = setTimeout(() => {
      startCueFired.current = true;
      speakRunCue(pickCue(cues.start));
    }, 2000);
    return () => clearTimeout(timer);
  }, [isTracking, mission, isFreeRun]);

  // Milestone cues at 25 / 50 / 75 / 100% (skip for free run — no targets)
  useEffect(() => {
    if (!mission || !isTracking || isFreeRun) return;

    const cues = MISSION_AUDIO_CUES[mission.type];
    const distRatio = targetDistanceKm > 0 ? distanceKm / targetDistanceKm : 0;
    const timeRatio = targetDurationMin > 0 ? elapsedSec / (targetDurationMin * 60) : 0;
    const progress = Math.max(distRatio, timeRatio);

    if (!milestone25Fired.current && progress >= 0.25) {
      milestone25Fired.current = true;
      speakRunCue(pickCue(cues.quarter));
    }
    if (!milestone50Fired.current && progress >= 0.5) {
      milestone50Fired.current = true;
      speakRunCue(pickCue(cues.half));
    }
    if (!milestone75Fired.current && progress >= 0.75) {
      milestone75Fired.current = true;
      speakRunCue(pickCue(cues.threeQuarter));
    }
    if (!goalReachedFired.current && progress >= 1.0) {
      goalReachedFired.current = true;
      speakRunCue(pickCue(cues.complete));
      triggerGoalReached(mission.title);
    }
  }, [distanceKm, elapsedSec, isTracking, isFreeRun, mission, targetDistanceKm, targetDurationMin, triggerGoalReached]);

  // Pan map to follow latest GPS point
  useEffect(() => {
    const latest = path[path.length - 1];
    if (latest && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: latest.latitude,
          longitude: latest.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        300,
      );
    }
  }, [path]);

  const handleFinish = () => {
    setRunActive(false);
    stop();
    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const step = Math.ceil(path.length / 100);
    const sampled = path.filter((_, i) => i % step === 0);
    router.replace({
      pathname: '/run/complete',
      params: {
        id: mission?.id ?? '',
        distanceKm: distanceKm.toFixed(3),
        durationMin: String(durationMin),
        pathJson: sampled.length >= 2 ? JSON.stringify(sampled) : '',
        goalMet: goalReachedFired.current ? '1' : '0',
        activityMode,
      },
    });
  };

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPaused, pause, resume]);

  const confirmAbort = useCallback(() => {
    if (isFreeRun) {
      Alert.alert(
        'End free run?',
        'Your route will not be saved.',
        [
          { text: 'Keep going', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: () => {
              setRunActive(false);
              stop();
              router.replace('/(tabs)/journey');
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      'Abort mission?',
      'GPS progress will be lost. This mission will be marked failed — you can retry from Journey.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Abort',
          style: 'destructive',
          onPress: () => {
            setRunActive(false);
            stop();
            if (mission) failMission(mission.id);
            router.replace('/(tabs)/journey');
          },
        },
      ],
    );
  }, [stop, isFreeRun, mission, failMission, setRunActive]);

  useEffect(() => {
    if (!isTracking) return;
    const handler = () => { confirmAbort(); return true; };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [isTracking, confirmAbort]);

  // ─── Error states ─────────────────────────────────────────────────────────

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission data not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Return to base</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <MaterialIcons name="location-off" size={48} color={colors.textTertiary} />
          <Text style={styles.permTitle}>Location Access Required</Text>
          <Text style={styles.permSub}>
            RunQuest needs location access to track your sortie. Enable it in Settings.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Return to base</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = missionConfig[mission.type];
  const distanceProgress = targetDistanceKm > 0 ? Math.min(distanceKm / targetDistanceKm, 1) : 0;
  const timeProgress = targetDurationMin > 0 ? Math.min(elapsedSec / (targetDurationMin * 60), 1) : 0;
  const overallProgress = Math.max(distanceProgress, timeProgress);
  const goalHit = goalReachedFired.current;

  const activityIcon = activityMode === 'cycle' ? 'directions-bike' : 'directions-run';
  const polylineCoords = path.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  const initialRegion = path.length > 0
    ? { latitude: path[0]!.latitude, longitude: path[0]!.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }
    : undefined;

  return (
    <SafeAreaView style={styles.safeOuter} edges={['top']}>
      {/* ─── Mission header — pinned above the map ────────────────── */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: config.color }]}>
        {/* Left: type pill */}
        <View style={[styles.typePill, { borderColor: config.color }]}>
          <MaterialIcons name={activityIcon} size={12} color={config.color} />
          <Text style={[styles.typeLabel, { color: config.color }]}>
            {activityMode === 'cycle' ? 'CYCLE' : config.label}
          </Text>
        </View>

        {/* Center: mission title */}
        <Text style={styles.missionTitle} numberOfLines={1}>{mission.title}</Text>

        {/* Right: elapsed time badge */}
        <View style={[styles.elapsedBadge, isPaused && styles.elapsedBadgePaused]}>
          <MaterialIcons
            name={isPaused ? 'pause' : 'timer'}
            size={12}
            color={isPaused ? colors.orange : colors.textSecondary}
          />
          <Text style={[styles.elapsedText, isPaused && styles.elapsedTextPaused]}>
            {isPaused ? 'PAUSED' : formatElapsed(elapsedSec)}
          </Text>
        </View>
      </Animated.View>

      {/* ─── Map — takes all remaining space ──────────────────────── */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={config.color}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        {/* Goal reached banner — floats over the map */}
        <Animated.View style={[styles.goalBanner, bannerStyle]} pointerEvents="none">
          <Animated.View style={[styles.goalBannerInner, pulseStyle, { borderColor: colors.primary }]}>
            <MaterialIcons name="emoji-events" size={18} color={colors.primary} />
            <Text style={styles.goalBannerTitle}>ZONE RESTORED</Text>
            <Text style={styles.goalBannerSub}>Goal reached — tap Finish when ready</Text>
          </Animated.View>
        </Animated.View>

        {/* Paused overlay */}
        {isPaused && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <MaterialIcons name="pause-circle-filled" size={56} color={colors.orange} style={{ opacity: 0.85 }} />
            <Text style={styles.pauseOverlayText}>MISSION PAUSED</Text>
          </View>
        )}
      </View>

      {/* ─── Bottom HUD ───────────────────────────────────────────── */}
      <SafeAreaView style={styles.hudOuter} edges={['bottom']}>
        <View style={styles.hud}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatTile label="TIME" value={formatElapsed(elapsedSec)} icon="timer" accent={colors.blue} />
            <View style={styles.statDivider} />
            <StatTile label="DISTANCE" value={formatDistance(distanceKm)} icon={activityIcon} accent={config.color} large />
            <View style={styles.statDivider} />
            <StatTile label="PACE" value={formatPace(distanceKm, elapsedSec)} icon="speed" accent={colors.ochre} />
          </View>

          {/* Target + progress — hidden for free run */}
          {!isFreeRun && (
            <View style={styles.progressSection}>
              <View style={styles.targetRow}>
                <Text style={styles.targetLabel}>TARGET</Text>
                <Text style={styles.targetValue}>
                  {formatDistance(targetDistanceKm)} · ~{targetDurationMin} min
                </Text>
                <Text style={[styles.progressPercent, goalHit && styles.progressPercentDone]}>
                  {goalHit ? '✓ COMPLETE' : `${Math.round(overallProgress * 100)}%`}
                </Text>
              </View>
              <ProgressBar
                progress={overallProgress}
                color={goalHit ? colors.primary : config.color}
                backgroundColor={colors.border}
                height={6}
              />
            </View>
          )}

          {/* Controls: Finish when goal reached; Pause + Abort only while goal is pending */}
          <View style={styles.controls}>
            {/* Finish button — goal reached or free run */}
            {(goalHit || isFreeRun) && (
              <TouchableOpacity
                style={[styles.finishBtn, styles.finishBtnGoal]}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isFreeRun ? 'stop' : 'emoji-events'}
                  size={20}
                  color={colors.textInverse}
                />
                <Text style={[styles.finishBtnText, styles.finishBtnTextGoal]}>
                  {isFreeRun ? 'FINISH FREE RUN' : 'COMPLETE MISSION'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Pause + Abort — hidden once the goal is reached for non-free-run missions */}
            {(isFreeRun || !goalHit) && (
              <View style={styles.pauseAbortRow}>
                <TouchableOpacity
                  style={[
                    styles.pauseResumeBtn,
                    styles.pauseAbortHalf,
                    isPaused && styles.pauseResumeBtnResume,
                  ]}
                  onPress={handlePauseResume}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={isPaused ? 'play-arrow' : 'pause'}
                    size={20}
                    color={isPaused ? colors.textInverse : colors.textSecondary}
                  />
                  <Text style={[styles.pauseResumeBtnText, isPaused && styles.pauseResumeBtnTextResume]}>
                    {isPaused ? 'RESUME' : 'PAUSE'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.abortBtn, styles.pauseAbortHalf]}
                  onPress={confirmAbort}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="close" size={20} color={colors.orange} />
                  <Text style={styles.abortBtnText}>{isFreeRun ? 'END' : 'ABORT'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function StatTile({ label, value, icon, accent, large }: {
  label: string; value: string; icon: string; accent: string; large?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <MaterialIcons name={icon as any} size={13} color={accent} />
      <Text style={[styles.statValue, large && styles.statValueLarge, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeOuter: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  // ─── Error / permission screens ───────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  } as ViewStyle,
  errorText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
  permTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  permSub: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  backBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  } as ViewStyle,
  backBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // ─── Mission header bar — above the map ──────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    gap: spacing.md,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    flexShrink: 0,
  } as ViewStyle,
  typeLabel: {
    fontSize: 10,
    fontWeight: fontWeights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  missionTitle: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  elapsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  } as ViewStyle,
  elapsedBadgePaused: {
    borderColor: colors.orange,
    backgroundColor: colors.orange + '22',
  } as ViewStyle,
  elapsedText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  elapsedTextPaused: {
    color: colors.orange,
    letterSpacing: 1,
  } as TextStyle,

  // ─── Map wrapper ──────────────────────────────────────────────────────────
  mapWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,

  // ─── Pause overlay ────────────────────────────────────────────────────────
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    zIndex: 5,
  } as ViewStyle,
  pauseOverlayText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } as TextStyle,

  // ─── Goal reached banner (floats over map) ────────────────────────────────
  goalBanner: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,
  goalBannerInner: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    maxWidth: '80%',
    ...shadows.lg,
  } as ViewStyle,
  goalBannerTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,
  goalBannerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  // ─── Bottom HUD ───────────────────────────────────────────────────────────
  hudOuter: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  } as ViewStyle,
  hud: {
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  } as ViewStyle,

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.border,
  } as ViewStyle,
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statValueLarge: {
    fontSize: fontSizes.xxl,
  } as TextStyle,
  statLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,

  // Target + progress
  progressSection: {
    gap: spacing.sm,
  } as ViewStyle,
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  targetLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  targetValue: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  } as TextStyle,
  progressPercent: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  } as TextStyle,
  progressPercentDone: {
    color: colors.primary,
  } as TextStyle,

  // Controls area
  controls: {
    gap: spacing.sm,
  } as ViewStyle,

  // Finish button — shown only when goal is reached
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  } as ViewStyle,
  finishBtnGoal: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  } as ViewStyle,
  finishBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  finishBtnTextGoal: {
    color: colors.textInverse,
  } as TextStyle,

  // Pause / Resume button
  pauseResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  } as ViewStyle,
  pauseResumeBtnResume: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  } as ViewStyle,
  pauseResumeBtnSmall: {
    paddingVertical: spacing.md,
  } as ViewStyle,
  pauseResumeBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
  pauseResumeBtnTextResume: {
    color: colors.textInverse,
  } as TextStyle,

  pauseAbortRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  } as ViewStyle,
  pauseAbortHalf: {
    flex: 1,
    minWidth: 0,
  } as ViewStyle,
  abortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orange,
    paddingVertical: spacing.lg,
  } as ViewStyle,
  abortBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 2,
  } as TextStyle,
});
