import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
  ViewStyle,
  TextStyle,
  Platform,
  Linking,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, {
  Polyline,
  PROVIDER_DEFAULT,
  type Region,
} from 'react-native-maps';
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
import { useUserStore } from '../../src/store/userStore';
import { getNowISOString } from '../../src/utils/dateUtils';
import { darkenHex } from '../../src/utils/hexColor';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  shadows,
  missionConfig,
} from '../../src/constants/theme';
import { stripEmojis } from '../../src/utils/stripEmojis';
import { formatDistance, formatDuration } from '../../src/utils/xpCalculator';
import {
  buildDisplayPath,
  calcDistanceKm,
  formatElapsed,
  formatPaceLiveDisplay,
  GPS_MAX_ACCURACY_M,
} from '../../src/utils/haversine';
import {
  useGpsTracking,
  initBackgroundCueTracking,
  stopBackgroundCueTracking,
} from '../../src/hooks/useGpsTracking';
import {
  playGoalReachedSound,
  speakRunCue,
  ensureRunPlaybackAudioMode,
  stopRunPlaybackAudioMode,
} from '../../src/services/audioService';
import { scheduleGoalReachedNotification } from '../../src/services/notificationService';
import {
  MISSION_AUDIO_CUES,
  FUN_RUN_ID,
  FUN_RUN_MISSION,
  pickCue,
  buildMissionStartLiveCue,
  pickMissionCompleteLiveCue,
} from '../../src/constants/missions';
import {
  findMissionById,
  normalizeRouteParam,
} from '../../src/utils/missionLookup';
import type { ActivityMode } from '../../src/types';
import { logEvent, Events } from '../../src/services/analytics';
import * as Location from 'expo-location';

/** Min time between map recenter animations (GPS updates faster; stacking causes flicker). */
const MAP_FOLLOW_MIN_INTERVAL_MS = 1600;
/** Min movement (km) to recenter before interval elapses (~4 m). */
const MAP_FOLLOW_MIN_MOVE_KM = 0.004;
/** Resume GPS centering after user stops manipulating the map. */
const MAP_FOLLOW_RESUME_AFTER_MS = 5000;
/** Ignore region-complete right after our programmatic moves (Apple Maps can emit extras). */
const MAP_FOLLOW_IGNORE_AFTER_PROGRAMMATIC_MS = 200;
const POLYLINE_WARMUP_MIN_POINTS = 5;
const POLYLINE_WARMUP_MIN_SECONDS = 10;

export default function ActiveRunScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; activityMode?: string }>();
  const id = normalizeRouteParam(params.id);
  const activityModeParam = normalizeRouteParam(params.activityMode);
  const profileDefaultMode = useUserStore(
    (s) => s.profile?.defaultActivityMode ?? 'cycle',
  );
  const activityMode: ActivityMode =
    activityModeParam === 'cycle'
      ? 'cycle'
      : activityModeParam === 'run'
        ? 'run'
        : profileDefaultMode;

  const weekMissions = useMissionsStore((s) => s.weekMissions);
  const abortMission = useMissionsStore((s) => s.abortMission);
  const appendRunHistoryEntry = useUserStore((s) => s.appendRunHistoryEntry);
  const isFreeRun = id === FUN_RUN_ID;
  const mission = isFreeRun
    ? FUN_RUN_MISSION
    : findMissionById(weekMissions, id);
  const setRunActive = useRunSessionStore((s) => s.setRunActive);
  const {
    acceptedPath,
    distanceKm,
    elapsedSec,
    speedMps,
    isTracking,
    isPaused,
    hasPermission,
    start,
    stop,
    pause,
    resume,
    gpsDebug,
  } = useGpsTracking();

  const paceDisplay = useMemo(
    () =>
      formatPaceLiveDisplay(
        acceptedPath,
        distanceKm,
        elapsedSec,
        speedMps,
        Date.now(),
      ),
    [acceptedPath, distanceKm, elapsedSec, speedMps],
  );

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

  const [distanceGoalReached, setDistanceGoalReached] = useState(false);
  const [distanceMetOnTime, setDistanceMetOnTime] = useState(true);
  const metOnTimeRef = useRef<boolean>(true);
  const firstDistanceMetRecordedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const goalAnnouncedRef = useRef(false);
  const startCueFired = useRef(false);
  const mapRef = useRef<MapView>(null);
  /** Throttle map recenter: GPS fires often; animating every fix causes flicker. */
  const mapFollowStateRef = useRef<{
    lastAtMs: number;
    lat: number;
    lng: number;
  } | null>(null);
  /** Avoid alternating animateCamera vs animateToRegion when altitude validity flickers. */
  const mapFollowModeRef = useRef<'unknown' | 'camera' | 'region'>('unknown');
  /** True just before animateCamera / animateToRegion from our follow logic (Apple has no isGesture). */
  const programmaticMapMoveRef = useRef(false);
  /** User panned/pinched; skip auto-follow until resume timer. */
  const userPausedMapFollowRef = useRef(false);
  const resumeFollowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ignoreUserGestureUntilMsRef = useRef(0);
  const [resumeFollowNonce, setResumeFollowNonce] = useState(0);

  const pathSnapRef = useRef(acceptedPath);
  pathSnapRef.current = acceptedPath;

  /** Last known fix so the map can center before Start / before the first watch callback. */
  const [mapBootstrapCoords, setMapBootstrapCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const pos = await Location.getLastKnownPositionAsync({});
        if (pos && !cancelled) {
          setMapBootstrapCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearMapFollowResumeTimer = useCallback(() => {
    if (resumeFollowTimeoutRef.current !== null) {
      clearTimeout(resumeFollowTimeoutRef.current);
      resumeFollowTimeoutRef.current = null;
    }
  }, []);

  const scheduleMapFollowResume = useCallback(() => {
    clearMapFollowResumeTimer();
    resumeFollowTimeoutRef.current = setTimeout(() => {
      resumeFollowTimeoutRef.current = null;
      userPausedMapFollowRef.current = false;
      setResumeFollowNonce((n) => n + 1);
    }, MAP_FOLLOW_RESUME_AFTER_MS);
  }, [clearMapFollowResumeTimer]);

  const onUserMapGesture = useCallback(() => {
    userPausedMapFollowRef.current = true;
    scheduleMapFollowResume();
  }, [scheduleMapFollowResume]);

  const handleMapRegionChangeComplete = useCallback(
    (_region: Region, details?: { isGesture?: boolean }) => {
      if (programmaticMapMoveRef.current) {
        programmaticMapMoveRef.current = false;
        ignoreUserGestureUntilMsRef.current =
          Date.now() + MAP_FOLLOW_IGNORE_AFTER_PROGRAMMATIC_MS;
        return;
      }
      if (Date.now() < ignoreUserGestureUntilMsRef.current) return;
      if (details?.isGesture === false) return;
      onUserMapGesture();
    },
    [onUserMapGesture],
  );

  const handleMapPanDrag = useCallback(() => {
    onUserMapGesture();
  }, [onUserMapGesture]);

  useEffect(() => {
    return () => {
      clearMapFollowResumeTimer();
    };
  }, [clearMapFollowResumeTimer]);

  // Reanimated values for goal-reached banner
  const bannerScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const triggerGoalReached = useCallback(
    async (missionTitle: string) => {
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
    },
    [bannerScale, pulseOpacity],
  );

  useEffect(() => {
    setRunActive(true);
    return () => setRunActive(false);
  }, [setRunActive]);

  const handleStartSession = useCallback(async () => {
    const trackingStarted = await start();
    if (!trackingStarted) return;
    setSessionStarted(true);
  }, [start]);

  useEffect(() => {
    if (!isTracking) return;
    ensureRunPlaybackAudioMode();
    return () => stopRunPlaybackAudioMode();
  }, [isTracking]);

  // 5-second start cue (skip for free run — no narrative)
  useEffect(() => {
    if (!mission || !isTracking || isFreeRun || startCueFired.current) return;
    const timer = setTimeout(() => {
      startCueFired.current = true;
      speakRunCue(buildMissionStartLiveCue());
    }, 5000);
    return () => clearTimeout(timer);
  }, [isTracking, mission, isFreeRun]);

  // Initialise background-safe milestone cues when the run starts.
  // Cues fire directly from the location callback and background task handler so
  // they work when the app is minimised or the screen is locked.
  useEffect(() => {
    if (!isTracking || !mission || isFreeRun || targetDistanceKm <= 0) return;
    const cues = mission.audioCues ?? MISSION_AUDIO_CUES[mission.type];
    initBackgroundCueTracking(targetDistanceKm, cues);
    return () => stopBackgroundCueTracking();
  }, [isTracking, mission, isFreeRun, targetDistanceKm]);

  // First time target distance is met: lock whether that was on-time (for XP). User can finish any time after.
  useEffect(() => {
    if (!mission || !isTracking || isFreeRun || targetDistanceKm <= 0) return;
    const distanceMet = distanceKm >= targetDistanceKm;
    if (!distanceMet || firstDistanceMetRecordedRef.current) return;
    firstDistanceMetRecordedRef.current = true;
    const elapsedMinFloor = Math.floor(elapsedSec / 60);
    const withinTime =
      targetDurationMin <= 0 ? true : elapsedMinFloor <= targetDurationMin;
    metOnTimeRef.current = withinTime;
    setDistanceMetOnTime(withinTime);
    setDistanceGoalReached(true);
  }, [
    distanceKm,
    elapsedSec,
    isTracking,
    isFreeRun,
    mission,
    targetDistanceKm,
    targetDurationMin,
  ]);

  // Announce goal + banner once when distance target is met
  useEffect(() => {
    if (
      !distanceGoalReached ||
      !mission ||
      isFreeRun ||
      goalAnnouncedRef.current
    )
      return;
    goalAnnouncedRef.current = true;
    speakRunCue(pickMissionCompleteLiveCue());
    triggerGoalReached(stripEmojis(mission.title));
  }, [distanceGoalReached, mission, isFreeRun, triggerGoalReached]);

  // Follow latest accepted GPS point while preserving user-chosen map rotation (heading/pitch).
  // Throttle: animating on every GPS tick stacks animations and flickers. Reset when path clears.
  useEffect(() => {
    if (acceptedPath.length === 0) {
      mapFollowStateRef.current = null;
      mapFollowModeRef.current = 'unknown';
      userPausedMapFollowRef.current = false;
      clearMapFollowResumeTimer();
      return;
    }

    if (userPausedMapFollowRef.current) return;

    const latest = acceptedPath[acceptedPath.length - 1];
    const map = mapRef.current;
    if (!latest || !map || !mapReady) return;

    const lat = latest.latitude;
    const lng = latest.longitude;
    const t0 = latest.timestamp;
    const prev = mapFollowStateRef.current;
    const now = Date.now();
    if (prev) {
      const dt = now - prev.lastAtMs;
      const moveKm = calcDistanceKm([
        { latitude: prev.lat, longitude: prev.lng, timestamp: t0 - 1 },
        { latitude: lat, longitude: lng, timestamp: t0 },
      ]);
      if (dt < MAP_FOLLOW_MIN_INTERVAL_MS && moveKm < MAP_FOLLOW_MIN_MOVE_KM) {
        return;
      }
    }

    // Reserve follow immediately so rapid path updates don't double-pass throttle.
    mapFollowStateRef.current = { lastAtMs: now, lat, lng };

    const run = async () => {
      const cur = pathSnapRef.current[pathSnapRef.current.length - 1];
      if (!cur) return;

      const regionFallback = {
        latitude: cur.latitude,
        longitude: cur.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      const commitFollow = () => {
        mapFollowStateRef.current = {
          lastAtMs: Date.now(),
          lat: cur.latitude,
          lng: cur.longitude,
        };
      };

      const snapLen = pathSnapRef.current.length;
      const panMs = snapLen <= 1 ? 0 : 400;

      const mode = mapFollowModeRef.current;

      if (mode === 'region') {
        programmaticMapMoveRef.current = true;
        map.animateToRegion(regionFallback, panMs);
        commitFollow();
        return;
      }

      try {
        const cam = await map.getCamera();
        const fresh = pathSnapRef.current[pathSnapRef.current.length - 1];
        if (!fresh) return;
        const center = { latitude: fresh.latitude, longitude: fresh.longitude };
        const heading = Number.isFinite(cam.heading) ? cam.heading : 0;
        const pitch = Number.isFinite(cam.pitch) ? cam.pitch : 0;

        if (Platform.OS === 'android') {
          const z = cam.zoom;
          if (z != null && z > 0) {
            programmaticMapMoveRef.current = true;
            map.animateCamera(
              {
                center,
                heading,
                pitch,
                zoom: z,
              },
              { duration: panMs },
            );
            mapFollowModeRef.current = 'camera';
            commitFollow();
            return;
          }
        } else {
          const alt = cam.altitude;
          if (alt != null && alt > 0 && Number.isFinite(alt)) {
            programmaticMapMoveRef.current = true;
            map.animateCamera(
              {
                center,
                heading,
                pitch,
                altitude: alt,
              },
              { duration: panMs },
            );
            mapFollowModeRef.current = 'camera';
            commitFollow();
            return;
          }
        }

        mapFollowModeRef.current = 'region';
        programmaticMapMoveRef.current = true;
        map.animateToRegion(
          {
            latitude: fresh.latitude,
            longitude: fresh.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          panMs,
        );
        commitFollow();
      } catch {
        mapFollowModeRef.current = 'region';
        const fresh = pathSnapRef.current[pathSnapRef.current.length - 1];
        if (!fresh) return;
        programmaticMapMoveRef.current = true;
        map.animateToRegion(
          {
            latitude: fresh.latitude,
            longitude: fresh.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          panMs,
        );
        commitFollow();
      }
    };
    void run();
  }, [acceptedPath, mapReady, resumeFollowNonce, clearMapFollowResumeTimer]);

  const handleFinish = () => {
    setRunActive(false);
    stop();
    const durationMin = Math.max(1, Math.round(elapsedSec / 60));
    const step = Math.ceil(acceptedPath.length / 100);
    const sampled = acceptedPath.filter((_, i) => i % step === 0);
    router.replace({
      pathname: '/run/complete',
      params: {
        id: mission?.id ?? '',
        distanceKm: distanceKm.toFixed(3),
        durationMin: String(durationMin),
        elapsedSec: String(elapsedSec),
        pathJson: sampled.length >= 2 ? JSON.stringify(sampled) : '',
        goalMet: distanceGoalReached ? '1' : '0',
        onTime: distanceGoalReached && metOnTimeRef.current ? '1' : '0',
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
      Alert.alert('End free run?', 'Your route will not be saved.', [
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
      ]);
      return;
    }
    Alert.alert(
      'Abort mission?',
      'This mission will be marked aborted — you can retry from Journey.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Abort',
          style: 'destructive',
          onPress: () => {
            setRunActive(false);
            stop();
            if (mission) {
              abortMission(mission.id);
              const durationMin = Math.max(0, Math.round(elapsedSec / 60));
              const step = Math.max(1, Math.ceil(acceptedPath.length / 100));
              const sampledPath = acceptedPath.filter((_, i) => i % step === 0);
              appendRunHistoryEntry({
                missionId: mission.id,
                completedAt: getNowISOString(),
                distanceKm: Math.max(0, distanceKm),
                durationMin,
                xpEarned: 0,
                streakDay: useUserStore.getState().streak,
                goalMet: false,
                outcome: 'aborted',
                activityMode,
                ...(sampledPath.length >= 2 ? { path: sampledPath } : {}),
              });
              void logEvent(Events.MISSION_ABORTED, {
                type: activityMode,
                duration_sec: elapsedSec,
                distance_km: parseFloat(distanceKm.toFixed(2)),
                reason: 'user_abort',
              });
            }
            router.replace('/(tabs)/journey');
          },
        },
      ],
    );
  }, [
    stop,
    isFreeRun,
    mission,
    abortMission,
    appendRunHistoryEntry,
    activityMode,
    setRunActive,
    distanceKm,
    elapsedSec,
  ]);

  useEffect(() => {
    if (!sessionStarted) {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      return () => sub.remove();
    }
    if (!isTracking) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmAbort();
      return true;
    });
    return () => sub.remove();
  }, [sessionStarted, isTracking, confirmAbort]);

  const hasWarmupStableAccuracy = useMemo(() => {
    const tail = acceptedPath.slice(-3);
    if (tail.length < 3) return false;
    return tail.every(
      (p) => p.accuracy == null || p.accuracy <= GPS_MAX_ACCURACY_M,
    );
  }, [acceptedPath]);

  const shouldShowPolyline = useMemo(() => {
    if (acceptedPath.length < 2) return false;
    if (
      acceptedPath.length >= POLYLINE_WARMUP_MIN_POINTS &&
      gpsDebug.warmupStable
    ) {
      return true;
    }
    const recentAccOk =
      gpsDebug.lastAccuracyM == null ||
      gpsDebug.lastAccuracyM <= GPS_MAX_ACCURACY_M;
    return (
      elapsedSec >= POLYLINE_WARMUP_MIN_SECONDS &&
      hasWarmupStableAccuracy &&
      recentAccOk
    );
  }, [
    acceptedPath.length,
    elapsedSec,
    gpsDebug.lastAccuracyM,
    gpsDebug.warmupStable,
    hasWarmupStableAccuracy,
  ]);

  const displayPath = useMemo(() => {
    if (!shouldShowPolyline) return [];
    return buildDisplayPath(acceptedPath);
  }, [acceptedPath, shouldShowPolyline]);

  const initialRegion = useMemo(() => {
    if (acceptedPath.length > 0) {
      const p = acceptedPath[0]!;
      return {
        latitude: p.latitude,
        longitude: p.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    if (mapBootstrapCoords) {
      return {
        latitude: mapBootstrapCoords.latitude,
        longitude: mapBootstrapCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [acceptedPath, mapBootstrapCoords]);

  // Snap map to last known user location as soon as the map is ready (initialRegion often only applies on first mount).
  useEffect(() => {
    if (!mapBootstrapCoords || !mapReady || acceptedPath.length > 0) return;
    const map = mapRef.current;
    if (!map) return;
    programmaticMapMoveRef.current = true;
    map.animateToRegion(
      {
        latitude: mapBootstrapCoords.latitude,
        longitude: mapBootstrapCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      0,
    );
  }, [mapBootstrapCoords, mapReady, acceptedPath.length]);

  // ─── Error states ─────────────────────────────────────────────────────────

  if (!mission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Mission data not found.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
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
          <MaterialIcons
            name="location-off"
            size={48}
            color={colors.textTertiary}
          />
          <Text style={styles.permTitle}>Location Access Required</Text>
          <Text style={styles.permSub}>
            RunQuest needs location access to track your mission. You can enable
            it in Settings.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            style={styles.backBtn}
          >
            <MaterialIcons name="settings" size={18} color={colors.primary} />
            <Text style={styles.backBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnSecondary}
          >
            <Text style={styles.backBtnSecondaryText}>Return to base</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const config = missionConfig[mission.type];
  const distanceProgress =
    targetDistanceKm > 0 ? Math.min(distanceKm / targetDistanceKm, 1) : 0;
  const overallProgress = distanceProgress;
  const goalHit = distanceGoalReached;

  const activityIcon =
    activityMode === 'cycle' ? 'directions-bike' : 'directions-run';

  return (
    <View style={styles.safeOuter}>
      {/* ─── Mission header — explicit top inset (modal + notch safe) ─ */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[
          styles.header,
          {
            borderBottomColor: config.color,
            paddingTop: insets.top + spacing.md,
          },
        ]}
      >
        {!sessionStarted ? (
          <TouchableOpacity
            style={styles.headerBack}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back to mission briefing"
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSideSpacer} />
        )}

        <View style={styles.missionTitleWrap}>
          <Text style={styles.missionTitle} numberOfLines={1}>
            {stripEmojis(mission.title)}
          </Text>
        </View>

        {/* Right: elapsed time badge */}
        <View
          style={[
            styles.elapsedBadge,
            isPaused && sessionStarted && styles.elapsedBadgePaused,
          ]}
        >
          <MaterialIcons
            name={
              !sessionStarted
                ? 'play-circle-outline'
                : isPaused
                  ? 'pause'
                  : 'timer'
            }
            size={12}
            color={
              !sessionStarted
                ? colors.primary
                : isPaused
                  ? colors.orange
                  : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.elapsedText,
              isPaused && sessionStarted && styles.elapsedTextPaused,
            ]}
          >
            {!sessionStarted
              ? 'READY'
              : isPaused
                ? 'PAUSED'
                : formatElapsed(elapsedSec)}
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
          onMapReady={() => setMapReady(true)}
          onRegionChangeComplete={handleMapRegionChangeComplete}
          onPanDrag={handleMapPanDrag}
          showsUserLocation
          showsMyLocationButton={false}
          mapType="standard"
        >
          {displayPath.length > 1 && (
            <Polyline
              coordinates={displayPath}
              strokeColor={colors.earthGreen}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              geodesic
            />
          )}
        </MapView>

        {sessionStarted && (
          <>
            {!isFreeRun && (
              <View style={styles.mapTargetStrip} pointerEvents="none">
                <View style={styles.mapTargetStripInner}>
                  <View style={styles.mapTargetCol}>
                    <Text style={styles.mapTargetLabel}>TARGET DISTANCE</Text>
                    <Text
                      style={[
                        styles.mapTargetValue,
                        { color: colors.earthGreen },
                      ]}
                    >
                      {formatDistance(targetDistanceKm)}
                    </Text>
                  </View>
                  <View style={styles.mapTargetStripDivider} />
                  <View style={styles.mapTargetCol}>
                    <Text style={styles.mapTargetLabel}>TIME LIMIT</Text>
                    <Text
                      style={[
                        styles.mapTargetValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ~{formatDuration(targetDurationMin)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {!sessionStarted && (
          <View style={styles.preStartOverlay}>
            <View style={styles.preStartCard}>
              {!mapReady ? (
                <Text style={styles.preStartLoading}>Loading map…</Text>
              ) : (
                <>
                  {!isFreeRun && (
                    <View style={styles.preStartTargets}>
                      <View style={styles.preStartTargetBlock}>
                        <Text style={styles.preStartTargetLabel}>DISTANCE</Text>
                        <Text
                          style={[
                            styles.preStartTargetBig,
                            { color: colors.earthGreen },
                          ]}
                        >
                          {formatDistance(targetDistanceKm)}
                        </Text>
                      </View>
                      <View style={styles.preStartTargetBlock}>
                        <Text style={styles.preStartTargetLabel}>TIME</Text>
                        <Text style={styles.preStartTargetBig}>
                          ~{formatDuration(targetDurationMin)}
                        </Text>
                      </View>
                    </View>
                  )}
                  {mapReady ? (
                    <Text style={styles.preStartHint}>
                      GPS tracking starts when you tap Start.
                    </Text>
                  ) : null}
                </>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.startMissionBtn,
                !mapReady && styles.startMissionBtnDisabled,
              ]}
              onPress={handleStartSession}
              disabled={!mapReady}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isFreeRun ? 'directions-run' : activityIcon}
                size={28}
                color={colors.textInverse}
              />
              <Text style={styles.startMissionBtnText}>
                {isFreeRun ? 'START FREE RUN' : 'START MISSION'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Goal reached banner — floats over the map */}
        {goalHit && (
          <Animated.View
            style={[styles.goalBanner, bannerStyle]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.goalBannerInner,
                pulseStyle,
                { borderColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="emoji-events"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.goalBannerTitle}>ZONE RESTORED</Text>
              <Text style={styles.goalBannerSub}>
                {distanceMetOnTime
                  ? 'Goal reached — tap Complete when ready'
                  : 'Distance met over time — partial XP. Tap Complete mission when ready.'}
              </Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* Paused overlay */}
        {isPaused && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <MaterialIcons
              name="pause-circle-filled"
              size={56}
              color={colors.orange}
              style={{ opacity: 0.85 }}
            />
            <Text style={styles.pauseOverlayText}>MISSION PAUSED</Text>
          </View>
        )}
      </View>

      {/* ─── Bottom HUD ───────────────────────────────────────────── */}
      {sessionStarted && (
        <SafeAreaView style={styles.hudOuter} edges={['bottom']}>
          <View style={styles.hud}>
            <View style={styles.statsTargetsCluster}>
              <View style={[styles.statsRow, styles.statsRowWithBorderBelow]}>
                <StatTile
                  label="TIME"
                  value={formatElapsed(elapsedSec)}
                  icon="timer"
                  accent={colors.textSecondary}
                  iconAccent={colors.earthGreen}
                  large
                />
                <View style={styles.statDivider} />
                <StatTile
                  label="DISTANCE"
                  value={formatDistance(distanceKm)}
                  icon={activityIcon}
                  accent={colors.earthGreen}
                  large
                />
                <View style={styles.statDivider} />
                <StatTile
                  label="PACE"
                  value={paceDisplay}
                  icon="speed"
                  accent={colors.textSecondary}
                  iconAccent={colors.earthGreen}
                />
              </View>
            </View>

            {/* Progress — hidden for free run */}
            {!isFreeRun && (
              <View style={styles.progressSection}>
                <View style={styles.progressHudRow}>
                  <Text style={styles.progressHudTitle}>Progress</Text>
                  <Text
                    style={[
                      styles.progressPercent,
                      goalHit && styles.progressPercentDone,
                    ]}
                  >
                    {goalHit
                      ? '✓ COMPLETE'
                      : `${Math.round(overallProgress * 100)}%`}
                  </Text>
                </View>
                <ProgressBar
                  progress={overallProgress}
                  color={colors.earthGreen}
                  backgroundColor={colors.border}
                  height={5}
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
                    name={isFreeRun ? 'check-circle' : 'emoji-events'}
                    size={20}
                    color={colors.textInverse}
                  />
                  <Text
                    style={[styles.finishBtnText, styles.finishBtnTextGoal]}
                  >
                    {isFreeRun ? 'COMPLETE RUN' : 'COMPLETE MISSION'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Pause + Abort — hidden once the goal is reached for non-free-run missions. Free run: pause only (no end/abort). */}
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
                      color={
                        isPaused ? colors.textInverse : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.pauseResumeBtnText,
                        isPaused && styles.pauseResumeBtnTextResume,
                      ]}
                    >
                      {isPaused ? 'RESUME' : 'PAUSE'}
                    </Text>
                  </TouchableOpacity>
                  {!isFreeRun && (
                    <TouchableOpacity
                      style={[styles.pauseResumeBtn, styles.pauseAbortHalf]}
                      onPress={confirmAbort}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.pauseResumeBtnText}>ABORT</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
  iconAccent,
  large,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
  /** When set, icon uses this color; value still uses `accent`. */
  iconAccent?: string;
  large?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <MaterialIcons
        name={icon as any}
        size={15}
        color={iconAccent ?? accent}
      />
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          large && styles.statValueLarge,
          { color: accent },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeOuter: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  backBtnSecondary: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  } as ViewStyle,
  backBtnSecondaryText: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,

  // ─── Mission header bar — above the map (paddingTop set via useSafeAreaInsets) ─
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    gap: spacing.md,
  } as ViewStyle,
  headerBack: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as ViewStyle,
  /** Keeps title centered vs. elapsed badge when the back button is hidden. */
  headerSideSpacer: {
    width: 40,
    height: 36,
    flexShrink: 0,
  } as ViewStyle,
  missionTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  } as ViewStyle,
  missionTitle: {
    width: '100%',
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    textAlign: 'left',
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

  mapTargetStrip: {
    position: 'absolute',
    top: spacing.xs,
    left: '10%',
    width: '80%',
    zIndex: 15,
  } as ViewStyle,
  mapTargetStripInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.md,
  } as ViewStyle,
  mapTargetCol: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  } as ViewStyle,
  mapTargetStripDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  } as ViewStyle,
  mapTargetLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,
  mapTargetValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  preStartOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 8, 0.72)',
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  } as ViewStyle,
  preStartCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  } as ViewStyle,
  preStartLoading: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  } as TextStyle,
  preStartTargets: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-around',
  } as ViewStyle,
  preStartTargetBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  } as ViewStyle,
  preStartTargetLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  } as TextStyle,
  preStartTargetBig: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  preStartHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
  startMissionBtn: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.earthGreen,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderWidth: 2,
    borderColor: darkenHex(colors.earthGreen, 0.74),
    ...shadows.lg,
  } as ViewStyle,
  startMissionBtnDisabled: {
    opacity: 0.45,
  } as ViewStyle,
  startMissionBtnText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 2,
    textTransform: 'uppercase',
  } as TextStyle,

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

  timeFailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 8, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    zIndex: 200,
  } as ViewStyle,
  timeFailTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  } as TextStyle,
  timeFailSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  } as TextStyle,
  timeFailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  } as ViewStyle,
  timeFailBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.textInverse,
    letterSpacing: 1,
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
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  } as ViewStyle,

  // Stats
  statsTargetsCluster: {
    gap: 0,
  } as ViewStyle,
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingBottom: spacing.xs,
  } as ViewStyle,
  statsRowWithBorderBelow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  statDivider: {
    width: 1,
    height: 56,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  } as ViewStyle,
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  } as ViewStyle,
  statValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.extrabold,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statValueLarge: {
    fontSize: fontSizes.xxxl,
  } as TextStyle,
  statLabel: {
    fontSize: 9,
    fontWeight: fontWeights.extrabold,
    color: colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as TextStyle,

  // Progress
  progressSection: {
    gap: spacing.xs,
  } as ViewStyle,
  progressHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } as ViewStyle,
  progressHudTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  } as TextStyle,
  progressPercent: {
    fontSize: fontSizes.md,
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
    paddingVertical: spacing.md,
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
    paddingVertical: spacing.md,
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
});
