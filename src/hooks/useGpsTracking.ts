import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { GpsPoint, MissionAudioCueSet } from '../types';
import {
  advanceGpsDistanceAnchor,
  GPS_MAX_ACCURACY_M,
  GPS_MAX_JUMP_M_SHORT_DT,
  GPS_POOR_ACCURACY_JUMP_M,
  GPS_POOR_ACCURACY_M,
  GPS_SHORT_DT_SEC,
  GPS_STATIONARY_RADIUS_M,
  GPS_STATIONARY_SPEED_MPS,
  haversineM,
} from '../utils/haversine';
import { GPS_MICRO_JITTER_MAX_ACCURACY_M } from '../constants/gpsTrackingConfig';
import { applyMicroJitterToDistanceDelta } from '../utils/gpsMicroJitterDistance';
import { speakRunCue } from '../services/audioService';
import { pickCue } from '../constants/missions';
import { logEvent, Events } from '../services/analytics';

// ─── Background task name ─────────────────────────────────────────────────────

export const BACKGROUND_LOCATION_TASK = 'runquest-background-location';

/** Foreground GPS: 5 m OS pre-filter reduces jitter callbacks before we even see them. */
const FG_DISTANCE_INTERVAL_M = 5;
const FG_TIME_INTERVAL_MS = 1000;

/** Background updates: slightly conservative vs foreground. */
const BG_DISTANCE_INTERVAL_M = 5;
const BG_TIME_INTERVAL_MS = 3000;
const STATIONARY_WINDOW_SIZE = 5;

interface GpsDebugSnapshot {
  acceptedPoints: number;
  rejectedPoints: number;
  lastAccuracyM: number | null;
  lastSpeedMps: number | null;
  lastDistanceDeltaM: number;
  warmupStable: boolean;
}

// ─── Shared buffer ────────────────────────────────────────────────────────────
// Points captured while the app is backgrounded are pushed here.
// The hook drains this buffer every second.

const _backgroundBuffer: GpsPoint[] = [];

// ─── Background-safe milestone cue state ─────────────────────────────────────
// Module-level state is accessible from both the main JS context and the
// background TaskManager handler, so cues fire even when the screen is locked.

/** Don’t fire % milestones until after the 5s mission-start cue has had time to play. */
const MILESTONE_MIN_MS_AFTER_RUN_START = 5500;

interface BgCueState {
  targetDistanceKm: number;
  cueSet: Pick<MissionAudioCueSet, 'quarter' | 'half' | 'threeQuarter'> | null;
  milestone25Fired: boolean;
  milestone50Fired: boolean;
  milestone75Fired: boolean;
  active: boolean;
  runStartedAtMs: number;
}

const _bgCueState: BgCueState = {
  targetDistanceKm: 0,
  cueSet: null,
  milestone25Fired: false,
  milestone50Fired: false,
  milestone75Fired: false,
  active: false,
  runStartedAtMs: 0,
};

// Incremental distance tracker — matches calcDistanceKmGps anchor logic (no O(n) each tick).
let _bgDistanceKm = 0;
let _bgAnchorPoint: GpsPoint | null = null;
let _bgRecentAccepted: GpsPoint[] = [];
// Timestamp set deduplicates points that arrive in both the foreground callback
// and the background task (both fire while the app is foregrounded).
const _bgSeenTimestamps = new Set<number>();

/** Mirrors hook micro-jitter state for background distance accumulation. */
let _bgMicroCommitted: GpsPoint | null = null;
let _bgMicroInJitter = false;

function _addBgPoint(point: GpsPoint, speedMps: number | null = null): {
  accepted: boolean;
  addedKm: number;
} {
  if (_bgSeenTimestamps.has(point.timestamp)) return { accepted: false, addedKm: 0 };
  _bgSeenTimestamps.add(point.timestamp);
  if (point.accuracy != null && point.accuracy > GPS_MAX_ACCURACY_M) {
    return { accepted: false, addedKm: 0 };
  }
  if (_bgAnchorPoint === null) {
    _bgAnchorPoint = point;
    _bgRecentAccepted = [point];
    const microEnabled =
      point.accuracy != null &&
      point.accuracy <= GPS_MICRO_JITTER_MAX_ACCURACY_M;
    const micro = applyMicroJitterToDistanceDelta({
      state: {
        committedAnchor: _bgMicroCommitted,
        inJitterZone: _bgMicroInJitter,
      },
      candidate: point,
      rawAddedKm: 0,
      microEnabled,
    });
    _bgMicroCommitted = micro.state.committedAnchor;
    _bgMicroInJitter = micro.state.inJitterZone;
    return { accepted: true, addedKm: 0 };
  }
  const distM = haversineM(_bgAnchorPoint, point);
  const dtSec = Math.max((point.timestamp - _bgAnchorPoint.timestamp) / 1000, 0.5);
  const impliedSpeedMps = distM / dtSec;
  if (dtSec <= GPS_SHORT_DT_SEC && distM > GPS_MAX_JUMP_M_SHORT_DT) {
    return { accepted: false, addedKm: 0 };
  }
  if (
    point.accuracy != null &&
    point.accuracy > GPS_POOR_ACCURACY_M &&
    distM > GPS_POOR_ACCURACY_JUMP_M
  ) {
    return { accepted: false, addedKm: 0 };
  }
  const { addedKm, anchor } = advanceGpsDistanceAnchor(_bgAnchorPoint, point);
  const stationaryWindow = [..._bgRecentAccepted.slice(-4), anchor];
  let radiusM = 0;
  if (stationaryWindow.length >= 3) {
    const center = stationaryWindow[stationaryWindow.length - 1]!;
    for (const p of stationaryWindow) {
      radiusM = Math.max(radiusM, haversineM(center, p));
    }
  }
  const candidateSpeed = speedMps ?? impliedSpeedMps;
  const stationaryBlocked =
    addedKm > 0 &&
    candidateSpeed <= GPS_STATIONARY_SPEED_MPS &&
    radiusM > 0 &&
    radiusM <= GPS_STATIONARY_RADIUS_M;
  const rawKmAfterStationary = stationaryBlocked ? 0 : addedKm;

  const microEnabled =
    point.accuracy != null &&
    point.accuracy <= GPS_MICRO_JITTER_MAX_ACCURACY_M;
  const micro = applyMicroJitterToDistanceDelta({
    state: {
      committedAnchor: _bgMicroCommitted,
      inJitterZone: _bgMicroInJitter,
    },
    candidate: point,
    rawAddedKm: rawKmAfterStationary,
    microEnabled,
  });
  _bgMicroCommitted = micro.state.committedAnchor;
  _bgMicroInJitter = micro.state.inJitterZone;
  const effectiveKm = micro.effectiveKm;

  if (stationaryBlocked) {
    return { accepted: false, addedKm: 0 };
  }

  _bgDistanceKm += effectiveKm;
  _bgAnchorPoint = anchor;
  if (addedKm > 0) {
    _bgRecentAccepted = [..._bgRecentAccepted, anchor].slice(-STATIONARY_WINDOW_SIZE);
  }
  return { accepted: effectiveKm > 0, addedKm: effectiveKm };
}

async function _checkBgMilestoneCues(): Promise<void> {
  const s = _bgCueState;
  if (!s.active || !s.cueSet || s.targetDistanceKm <= 0) return;
  if (Date.now() - s.runStartedAtMs < MILESTONE_MIN_MS_AFTER_RUN_START) return;
  const ratio = _bgDistanceKm / s.targetDistanceKm;
  const t25 = 0.25;
  const t50 = 0.5;
  const t75 = 0.75;
  if (!s.milestone25Fired && ratio >= t25) {
    s.milestone25Fired = true;
    await speakRunCue(pickCue(s.cueSet.quarter));
  }
  if (!s.milestone50Fired && ratio >= t50) {
    s.milestone50Fired = true;
    await speakRunCue(pickCue(s.cueSet.half));
  }
  if (!s.milestone75Fired && ratio >= t75) {
    s.milestone75Fired = true;
    await speakRunCue(pickCue(s.cueSet.threeQuarter));
  }
}

/**
 * Call once tracking starts to enable background-safe milestone audio cues.
 * Cues fire from both the foreground location callback and the background task
 * handler, so they play whether the app is active, minimised, or screen-locked.
 */
export function initBackgroundCueTracking(
  targetDistanceKm: number,
  cueSet: Pick<MissionAudioCueSet, 'quarter' | 'half' | 'threeQuarter'> | null,
): void {
  _bgCueState.targetDistanceKm = targetDistanceKm;
  _bgCueState.cueSet = cueSet;
  _bgCueState.milestone25Fired = false;
  _bgCueState.milestone50Fired = false;
  _bgCueState.milestone75Fired = false;
  _bgCueState.runStartedAtMs = Date.now();
  _bgCueState.active = !!cueSet && targetDistanceKm > 0;
}

/** Call when the run ends or is aborted to stop cue checking. */
export function stopBackgroundCueTracking(): void {
  _bgCueState.active = false;
}

// ─── Register background task (must be at module top-level, outside any component) ─

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    void logEvent(Events.GPS_INTERRUPTED);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) {
    const point: GpsPoint = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
      ...(loc.coords.accuracy != null && loc.coords.accuracy > 0
        ? { accuracy: loc.coords.accuracy }
        : {}),
    };
    _backgroundBuffer.push(point);
    _addBgPoint(point, loc.coords.speed ?? null);
  }
  // Await cue playback so the task stays alive until player.play() fires on native.
  // Without this await, iOS suspends JS before speakRunCue's async chain completes.
  await _checkBgMilestoneCues();
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface GpsTrackingState {
  /** Canonical filtered GPS path used for distance, pace, persistence, mission logic. */
  acceptedPath: GpsPoint[];
  /** Backward-compatible alias of acceptedPath. */
  path: GpsPoint[];
  distanceKm: number;
  elapsedSec: number;
  /** Latest reported speed in m/s, or null if unknown (foreground updates only). */
  speedMps: number | null;
  isTracking: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  gpsDebug: GpsDebugSnapshot;
  /** Resolves to true when foreground location permission is granted and tracking is active. */
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

export function useGpsTracking(): GpsTrackingState {
  const [path, setPath] = useState<GpsPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [speedMps, setSpeedMps] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [gpsDebug, setGpsDebug] = useState<GpsDebugSnapshot>({
    acceptedPoints: 0,
    rejectedPoints: 0,
    lastAccuracyM: null,
    lastSpeedMps: null,
    lastDistanceDeltaM: 0,
    warmupStable: false,
  });

  const fgSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Accumulated ms of active movement (does not count paused time)
  const accumulatedMsRef = useRef<number>(0);
  // Timestamp of when the current active segment started
  const segmentStartMsRef = useRef<number | null>(null);
  const pathRef = useRef<GpsPoint[]>([]);
  // Whether background permission was granted (needed for resume)
  const hasBgRef = useRef(false);
  /** False after stop — avoids applying cold-start getCurrentPositionAsync after session ends. */
  const trackingActiveRef = useRef(false);
  /**
   * Incremental distance accumulator — updated only when a fix passes both the
   * accuracy gate and the anchor-distance gate. Never recalculated from the full
   * path, so jittery points stored for map display cannot inflate the total.
   */
  const distanceKmRef = useRef<number>(0);
  /** Last GPS fix that was accepted as real movement (the anchor for jitter gating). */
  const anchorPointRef = useRef<GpsPoint | null>(null);
  const recentAcceptedRef = useRef<GpsPoint[]>([]);
  const rejectedPointsRef = useRef<number>(0);
  const acceptedPointsRef = useRef<number>(0);
  const warmupStableRef = useRef(false);
  /**
   * Micro-jitter deadband (distance totals only): committed anchor + hysteresis.
   * Independent of `anchorPointRef` / polyline path.
   */
  const microDistanceCommittedAnchorRef = useRef<GpsPoint | null>(null);
  const microInJitterZoneRef = useRef(false);

  const _updateGpsDebug = useCallback(
    (next: Partial<Omit<GpsDebugSnapshot, 'acceptedPoints' | 'rejectedPoints'>>) => {
      setGpsDebug((prev) => {
        const snapshot: GpsDebugSnapshot = {
          acceptedPoints: acceptedPointsRef.current,
          rejectedPoints: rejectedPointsRef.current,
          lastAccuracyM:
            next.lastAccuracyM === undefined ? prev.lastAccuracyM : next.lastAccuracyM,
          lastSpeedMps:
            next.lastSpeedMps === undefined ? prev.lastSpeedMps : next.lastSpeedMps,
          lastDistanceDeltaM:
            next.lastDistanceDeltaM === undefined
              ? prev.lastDistanceDeltaM
              : next.lastDistanceDeltaM,
          warmupStable:
            next.warmupStable === undefined ? warmupStableRef.current : next.warmupStable,
        };
        if (__DEV__) {
          console.debug('[GPS]', {
            accepted: snapshot.acceptedPoints,
            rejected: snapshot.rejectedPoints,
            accM: snapshot.lastAccuracyM,
            speedMps: snapshot.lastSpeedMps,
            deltaM: snapshot.lastDistanceDeltaM,
            warmupStable: snapshot.warmupStable,
          });
        }
        return snapshot;
      });
    },
    [],
  );

  const _startForegroundWatcher = useCallback(async () => {
    fgSubscriptionRef.current?.remove();
    fgSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: FG_DISTANCE_INTERVAL_M,
        timeInterval: FG_TIME_INTERVAL_MS,
      },
      async (loc) => {
        const sp = loc.coords.speed;
        const speedMps = sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null;
        setSpeedMps(speedMps);

        const acc = loc.coords.accuracy;
        // Reject fixes with poor horizontal accuracy (indoor multipath, poor geometry).
        if (acc != null && acc > GPS_MAX_ACCURACY_M) {
          rejectedPointsRef.current += 1;
          _updateGpsDebug({
            lastAccuracyM: acc,
            lastSpeedMps: speedMps,
            lastDistanceDeltaM: 0,
          });
          return;
        }

        const point: GpsPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          ...(acc != null && acc > 0 ? { accuracy: acc } : {}),
        };

        // Run the fix through the anchor gate (distance + speed checks).
        // advanceGpsDistanceAnchor rejects: too close to anchor (jitter) OR
        // implies unrealistically high speed (GPS jump / phone shaking).
        let addedKm = 0;
        if (anchorPointRef.current === null) {
          anchorPointRef.current = point;
        } else {
          const distM = haversineM(anchorPointRef.current, point);
          const dtSec = Math.max(
            (point.timestamp - anchorPointRef.current.timestamp) / 1000,
            0.5,
          );
          const impliedSpeedMps = distM / dtSec;
          if (dtSec <= GPS_SHORT_DT_SEC && distM > GPS_MAX_JUMP_M_SHORT_DT) {
            rejectedPointsRef.current += 1;
            _updateGpsDebug({
              lastAccuracyM: point.accuracy ?? null,
              lastSpeedMps: speedMps ?? impliedSpeedMps,
              lastDistanceDeltaM: 0,
            });
            return;
          }
          if (
            point.accuracy != null &&
            point.accuracy > GPS_POOR_ACCURACY_M &&
            distM > GPS_POOR_ACCURACY_JUMP_M
          ) {
            rejectedPointsRef.current += 1;
            _updateGpsDebug({
              lastAccuracyM: point.accuracy,
              lastSpeedMps: speedMps ?? impliedSpeedMps,
              lastDistanceDeltaM: 0,
            });
            return;
          }
          const result = advanceGpsDistanceAnchor(anchorPointRef.current, point);
          addedKm = result.addedKm;
          const proposedAnchor = result.anchor;
          const latestAccepted = recentAcceptedRef.current;
          const candidateSpeed = speedMps ?? impliedSpeedMps;
          const stationaryWindow = [...latestAccepted.slice(-4), proposedAnchor];
          let radiusM = 0;
          if (stationaryWindow.length >= 3) {
            const center = stationaryWindow[stationaryWindow.length - 1]!;
            for (const p of stationaryWindow) {
              radiusM = Math.max(radiusM, haversineM(center, p));
            }
          }
          const stationaryBlocked =
            addedKm > 0 &&
            candidateSpeed <= GPS_STATIONARY_SPEED_MPS &&
            radiusM > 0 &&
            radiusM <= GPS_STATIONARY_RADIUS_M;
          if (stationaryBlocked) {
            addedKm = 0;
            _updateGpsDebug({
              lastAccuracyM: point.accuracy ?? null,
              lastSpeedMps: candidateSpeed,
              lastDistanceDeltaM: 0,
            });
          } else {
            anchorPointRef.current = proposedAnchor;
          }
        }

        const rawKmAfterStationary = addedKm;
        const micro = applyMicroJitterToDistanceDelta({
          state: {
            committedAnchor: microDistanceCommittedAnchorRef.current,
            inJitterZone: microInJitterZoneRef.current,
          },
          candidate: point,
          rawAddedKm: rawKmAfterStationary,
          microEnabled: true,
        });
        microDistanceCommittedAnchorRef.current = micro.state.committedAnchor;
        microInJitterZoneRef.current = micro.state.inJitterZone;
        const effectiveDistanceKm = micro.effectiveKm;

        // Only add accepted fixes to the path so map polyline and pace window
        // never see raw jitter points.
        const anchorAdvanced = rawKmAfterStationary > 0;
        const isFirstPoint = pathRef.current.length === 0;
        if (isFirstPoint || anchorAdvanced) {
          const updated = [...pathRef.current, point];
          pathRef.current = updated;
          setPath(updated);
          acceptedPointsRef.current += 1;
          recentAcceptedRef.current = updated.slice(-STATIONARY_WINDOW_SIZE);
          const stableTail = updated.slice(-3);
          warmupStableRef.current =
            stableTail.length >= 3 &&
            stableTail.every(
              (p) => p.accuracy == null || p.accuracy <= GPS_MAX_ACCURACY_M,
            );
        }
        if (anchorAdvanced) {
          distanceKmRef.current += effectiveDistanceKm;
          setDistanceKm(distanceKmRef.current);
        }
        if (!isFirstPoint && !anchorAdvanced) {
          rejectedPointsRef.current += 1;
        }
        _updateGpsDebug({
          lastAccuracyM: point.accuracy ?? null,
          lastSpeedMps: speedMps,
          lastDistanceDeltaM: effectiveDistanceKm * 1000,
          warmupStable: warmupStableRef.current,
        });

        // Update background-safe distance tracker and fire any due milestone cues.
        _addBgPoint(point, speedMps);
        await _checkBgMilestoneCues();
      },
    );
  }, [_updateGpsDebug]);

  const _startBackgroundTask = useCallback(async () => {
    if (!hasBgRef.current) return;
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: BG_DISTANCE_INTERVAL_M,
          timeInterval: BG_TIME_INTERVAL_MS,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'RunQuest is tracking your run',
            notificationBody: 'Keep moving — your path is being recorded.',
            notificationColor: '#F68F4D',
          },
        });
      }
    } catch {
      // Background task failed to start — foreground-only fallback still active
    }
  }, []);

  const _stopLocationTracking = useCallback(async () => {
    fgSubscriptionRef.current?.remove();
    fgSubscriptionRef.current = null;
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // ignore
    }
  }, []);

  const stop = useCallback(async () => {
    await _stopLocationTracking();
    _backgroundBuffer.length = 0;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    trackingActiveRef.current = false;
    setIsTracking(false);
    setIsPaused(false);
    setSpeedMps(null);
  }, [_stopLocationTracking]);

  const pause = useCallback(async () => {
    if (!isTracking || isPaused) return;
    // Capture elapsed time for this active segment
    if (segmentStartMsRef.current !== null) {
      accumulatedMsRef.current += Date.now() - segmentStartMsRef.current;
      segmentStartMsRef.current = null;
    }
    await _stopLocationTracking();
    setSpeedMps(null);
    setIsPaused(true);
  }, [isTracking, isPaused, _stopLocationTracking]);

  const resume = useCallback(async () => {
    if (!isTracking || !isPaused) return;
    // Reset anchor so the first fix after resuming doesn't bridge the pause gap.
    anchorPointRef.current = null;
    microDistanceCommittedAnchorRef.current = null;
    microInJitterZoneRef.current = false;
    _bgAnchorPoint = null;
    _bgRecentAccepted = [];
    _bgMicroCommitted = null;
    _bgMicroInJitter = false;
    segmentStartMsRef.current = Date.now();
    await _startForegroundWatcher();
    await _startBackgroundTask();
    setIsPaused(false);
  }, [isTracking, isPaused, _startForegroundWatcher, _startBackgroundTask]);

  const start = useCallback(async () => {
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setHasPermission(false);
      void logEvent(Events.GPS_TRACKING_FAILED, { reason: 'permission_denied' });
      return false;
    }

    let hasBg = false;
    try {
      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      hasBg = bgStatus === 'granted';
    } catch {
      // expo-location may throw if already determined on some OS versions
    }
    hasBgRef.current = hasBg;

    setHasPermission(true);

    // Reset state for a fresh run
    pathRef.current = [];
    _backgroundBuffer.length = 0;
    distanceKmRef.current = 0;
    anchorPointRef.current = null;
    microDistanceCommittedAnchorRef.current = null;
    microInJitterZoneRef.current = false;
    recentAcceptedRef.current = [];
    rejectedPointsRef.current = 0;
    acceptedPointsRef.current = 0;
    warmupStableRef.current = false;

    // Reset background-safe distance tracking for the new run.
    _bgDistanceKm = 0;
    _bgAnchorPoint = null;
    _bgRecentAccepted = [];
    _bgMicroCommitted = null;
    _bgMicroInJitter = false;
    _bgSeenTimestamps.clear();

    accumulatedMsRef.current = 0;
    segmentStartMsRef.current = Date.now();
    setPath([]);
    setDistanceKm(0);
    setElapsedSec(0);
    setSpeedMps(null);
    setIsTracking(true);
    setIsPaused(false);
    setGpsDebug({
      acceptedPoints: 0,
      rejectedPoints: 0,
      lastAccuracyM: null,
      lastSpeedMps: null,
      lastDistanceDeltaM: 0,
      warmupStable: false,
    });
    trackingActiveRef.current = true;

    // Last-known + optional one-shot fix: watchPosition may wait for movement / interval.
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        const point: GpsPoint = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          timestamp: last.timestamp,
          ...(last.coords.accuracy != null && last.coords.accuracy > 0
            ? { accuracy: last.coords.accuracy }
            : {}),
        };
        pathRef.current = [point];
        setPath([point]);
        acceptedPointsRef.current = 1;
        recentAcceptedRef.current = [point];
        warmupStableRef.current =
          point.accuracy == null || point.accuracy <= GPS_MAX_ACCURACY_M;
        const sp = last.coords.speed;
        _addBgPoint(point, sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null);
        setSpeedMps(
          sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null,
        );
      }
    } catch {
      // ignore
    }

    await _startForegroundWatcher();
    await _startBackgroundTask();
    void logEvent(Events.GPS_TRACKING_STARTED);

    if (pathRef.current.length === 0) {
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((loc) => {
          if (!trackingActiveRef.current) return;
          if (pathRef.current.length > 0) return;
          const point: GpsPoint = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: loc.timestamp,
            ...(loc.coords.accuracy != null && loc.coords.accuracy > 0
              ? { accuracy: loc.coords.accuracy }
              : {}),
          };
          if (_bgSeenTimestamps.has(point.timestamp)) return;
          pathRef.current = [point];
          setPath([point]);
          acceptedPointsRef.current = 1;
          recentAcceptedRef.current = [point];
          warmupStableRef.current =
            point.accuracy == null || point.accuracy <= GPS_MAX_ACCURACY_M;
          const sp = loc.coords.speed;
          _addBgPoint(point, sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null);
          setSpeedMps(
            sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null,
          );
        })
        .catch(() => {});
    }

    // ── Timer: elapsed time + drain background buffer ─────────────────────
    // Native expo-location + TaskManager receive fixes while backgrounded; JS merges
    // buffered points here when the app runs again (not React-only tracking).
    timerRef.current = setInterval(() => {
      // Only advance the clock while not paused
      if (segmentStartMsRef.current !== null) {
        const total =
          accumulatedMsRef.current + (Date.now() - segmentStartMsRef.current);
        setElapsedSec(Math.floor(total / 1000));
      }

      // Merge any background points that arrived while app was minimised.
      // Distance was already accumulated by _addBgPoint (which mirrors the same
      // anchor-gate logic), so we only need to sync paths and copy over the total.
      if (_backgroundBuffer.length > 0) {
        const newPoints = _backgroundBuffer.splice(0, _backgroundBuffer.length);
        const existingTimestamps = new Set(
          pathRef.current.map((p) => p.timestamp),
        );
        const unique = newPoints.filter(
          (p) => !existingTimestamps.has(p.timestamp),
        );
        if (unique.length > 0) {
          const merged = [...pathRef.current, ...unique].sort(
            (a, b) => a.timestamp - b.timestamp,
          );
          pathRef.current = merged;
          setPath(merged);
          // _bgDistanceKm is the authoritative total while backgrounded; sync it.
          distanceKmRef.current = _bgDistanceKm;
          setDistanceKm(_bgDistanceKm);
        }
      }
    }, 1000);

    return true;
  }, [_startForegroundWatcher, _startBackgroundTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fgSubscriptionRef.current?.remove();
      if (timerRef.current !== null) clearInterval(timerRef.current);
      TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK).then(
        (registered) => {
          if (registered)
            Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(
              () => {},
            );
        },
      );
    };
  }, []);

  return {
    acceptedPath: path,
    path,
    distanceKm,
    elapsedSec,
    speedMps,
    isTracking,
    isPaused,
    hasPermission,
    gpsDebug,
    start,
    stop,
    pause,
    resume,
  };
}
