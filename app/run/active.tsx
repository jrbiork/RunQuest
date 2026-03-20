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
  FadeInDown,
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

export default function ActiveRunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const mission = weekMissions.find((m) => m.id === id);
  const setRunActive = useRunSessionStore((s) => s.setRunActive);
  const { path, distanceKm, elapsedSec, isTracking, hasPermission, start, stop } =
    useGpsTracking();

  const goalReachedFired = useRef(false);
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
    // Animate banner in
    bannerScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
    await Promise.all([
      playGoalReachedSound(),
      scheduleGoalReachedNotification(missionTitle),
    ]);
  }, [bannerScale, pulseOpacity]);

  // Lock the run modal (disable swipe-to-dismiss) for the duration of the run
  useEffect(() => {
    setRunActive(true);
    return () => setRunActive(false);
  }, [setRunActive]);

  // Start tracking as soon as the screen mounts
  useEffect(() => {
    start();
  }, [start]);

  // Detect goal completion + milestone TTS cues
  useEffect(() => {
    if (!mission || !isTracking) return;

    // Compute progress as the max of distance-ratio and time-ratio
    const distRatio = mission.targetDistanceKm > 0 ? distanceKm / mission.targetDistanceKm : 0;
    const timeRatio = mission.targetDurationMin > 0 ? elapsedSec / (mission.targetDurationMin * 60) : 0;
    const progress = Math.max(distRatio, timeRatio);

    if (!milestone25Fired.current && progress >= 0.25) {
      milestone25Fired.current = true;
      speakRunCue('Signal weak. Keep moving, Runner.');
    }
    if (!milestone50Fired.current && progress >= 0.5) {
      milestone50Fired.current = true;
      speakRunCue('Halfway. The zone can feel you.');
    }
    if (!milestone75Fired.current && progress >= 0.75) {
      milestone75Fired.current = true;
      speakRunCue('Final stretch. Do not stop now.');
    }

    if (!goalReachedFired.current && progress >= 1.0) {
      goalReachedFired.current = true;
      triggerGoalReached(mission.title);
    }
  }, [distanceKm, elapsedSec, isTracking, mission, triggerGoalReached]);

  // Pan map to follow the latest GPS point
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
      },
    });
  };

  // Prompt before leaving while a run is active — covers swipe-down, hardware back, etc.
  const confirmAbort = useCallback(() => {
    Alert.alert(
      'Stop this run?',
      'Your GPS progress will be lost.',
      [
        { text: 'Keep Running', style: 'cancel' },
        {
          text: 'Stop Run',
          style: 'destructive',
          onPress: () => {
            setRunActive(false);
            stop();
            router.back();
          },
        },
      ],
    );
  }, [stop]);

  // Block Android hardware back button
  useEffect(() => {
    if (!isTracking) return;
    const handler = () => {
      confirmAbort();
      return true; // consume the event
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [isTracking, confirmAbort]);

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
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
          <Text style={styles.permTitle}>Location Access Needed</Text>
          <Text style={styles.permSub}>
            RunQuest needs location access to track your run. Enable it in Settings.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = missionConfig[mission.type];
  const distanceProgress = Math.min(distanceKm / Math.max(mission.targetDistanceKm, 0.01), 1);
  const timeProgress = Math.min(elapsedSec / Math.max(mission.targetDurationMin * 60, 1), 1);
  const overallProgress = Math.max(distanceProgress, timeProgress);
  const goalHit = goalReachedFired.current;

  // Build polyline coordinates for react-native-maps
  const polylineCoords = path.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const initialRegion =
    path.length > 0
      ? {
          latitude: path[0]!.latitude,
          longitude: path[0]!.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }
      : undefined;

  return (
    <View style={styles.container}>
      {/* Map fills the screen */}
      <MapView
        ref={mapRef}
        style={styles.map}
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

      {/* Top header bar */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          {/* Spacer — no close button while run is active */}
          <View style={styles.headerEnd} />

          <View style={styles.headerCenter}>
            <View style={[styles.typePill, { backgroundColor: config.color + '22' }]}>
              <MaterialIcons name={config.icon as any} size={12} color={config.color} />
              <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={styles.missionTitle} numberOfLines={1}>{mission.title}</Text>
          </View>

          {/* Spacer to balance layout */}
          <View style={styles.headerEnd} />
        </Animated.View>
      </SafeAreaView>

      {/* Goal reached banner */}
      <Animated.View style={[styles.goalBanner, bannerStyle]}>
        <Animated.View style={[styles.goalBannerInner, pulseStyle]}>
          <MaterialIcons name="celebration" size={36} color={colors.primary} />
          <Text style={styles.goalBannerText}>Goal Reached!</Text>
          <Text style={styles.goalBannerSub}>Keep going or finish your run</Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom stats HUD */}
      <SafeAreaView style={styles.hudSafe} edges={['bottom']}>
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.hud}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatTile
              label="TIME"
              value={formatElapsed(elapsedSec)}
              icon="timer"
              accent={colors.blue}
            />
            <View style={styles.statDivider} />
            <StatTile
              label="DISTANCE"
              value={formatDistance(distanceKm)}
              icon="straighten"
              accent={config.color}
              large
            />
            <View style={styles.statDivider} />
            <StatTile
              label="PACE"
              value={formatPace(distanceKm, elapsedSec)}
              icon="speed"
              accent={colors.purple}
            />
          </View>

          {/* Targets */}
          <View style={styles.targetsRow}>
            <Text style={styles.targetText}>
              Target: {formatDistance(mission.targetDistanceKm)} · ~{mission.targetDurationMin} min
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <ProgressBar
              progress={overallProgress}
              color={goalHit ? colors.primary : config.color}
              backgroundColor={colors.border}
              height={8}
            />
            <Text style={[styles.progressLabel, goalHit && styles.progressLabelDone]}>
              {goalHit ? '✓ Goal complete' : `${Math.round(overallProgress * 100)}% to goal`}
            </Text>
          </View>

          {/* Finish button */}
          <TouchableOpacity
            style={[styles.finishBtn, goalHit && styles.finishBtnActive]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="flag"
              size={20}
              color={goalHit ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.finishBtnText, goalHit && styles.finishBtnTextActive]}>
              {goalHit ? 'Finish Run' : 'Finish Early'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
  large,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <MaterialIcons name={icon as any} size={14} color={accent} />
      <Text style={[styles.statValue, large && styles.statValueLarge]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  map: {
    ...StyleSheet.absoluteFillObject,
  } as ViewStyle,
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
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
  } as ViewStyle,
  backBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  } as TextStyle,

  // Header
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
    gap: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headerCenter: {
    flex: 1,
    gap: spacing.xs,
  } as ViewStyle,
  headerEnd: {
    width: 36,
  } as ViewStyle,
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    gap: 4,
  } as ViewStyle,
  typeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  missionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  } as TextStyle,

  // Goal banner
  goalBanner: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 10,
  } as ViewStyle,
  goalBannerInner: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.lg,
  } as ViewStyle,
  goalBannerText: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  } as TextStyle,
  goalBannerSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  } as TextStyle,

  // Bottom HUD
  hudSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  } as ViewStyle,
  hud: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  } as ViewStyle,

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  } as ViewStyle,
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  } as ViewStyle,
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as TextStyle,
  statValueLarge: {
    fontSize: fontSizes.xxl,
  } as TextStyle,
  statLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.textTertiary,
    letterSpacing: 0.8,
  } as TextStyle,

  targetsRow: {
    alignItems: 'center',
  } as ViewStyle,
  targetText: {
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    fontWeight: fontWeights.medium,
  } as TextStyle,

  progressWrap: {
    gap: spacing.sm,
  } as ViewStyle,
  progressLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
  } as TextStyle,
  progressLabelDone: {
    color: colors.primary,
  } as TextStyle,

  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  } as ViewStyle,
  finishBtnActive: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  finishBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  } as TextStyle,
  finishBtnTextActive: {
    color: colors.textInverse,
  } as TextStyle,
});
