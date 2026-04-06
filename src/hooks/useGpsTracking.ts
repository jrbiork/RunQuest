import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { GpsPoint, MissionAudioCueSet } from '../types';
import { calcDistanceKmGps } from '../utils/haversine';
import { speakRunCue } from '../services/audioService';
import { pickCue } from '../constants/missions';

// ─── Background task name ─────────────────────────────────────────────────────

export const BACKGROUND_LOCATION_TASK = 'runquest-background-location';

/** Foreground GPS: tighter intervals so distance/pace appear sooner (battery vs responsiveness). */
const FG_DISTANCE_INTERVAL_M = 2;
const FG_TIME_INTERVAL_MS = 1000;

/** Background updates: slightly conservative vs foreground. */
const BG_DISTANCE_INTERVAL_M = 5;
const BG_TIME_INTERVAL_MS = 3000;

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

// Incremental distance tracker — avoids O(n) full-path recalculation on each update.
let _bgDistanceKm = 0;
let _bgLastPoint: GpsPoint | null = null;
// Timestamp set deduplicates points that arrive in both the foreground callback
// and the background task (both fire while the app is foregrounded).
const _bgSeenTimestamps = new Set<number>();

function _addBgPoint(point: GpsPoint): void {
  if (_bgSeenTimestamps.has(point.timestamp)) return;
  _bgSeenTimestamps.add(point.timestamp);
  if (_bgLastPoint) {
    // reuse noise-floor filtering from calcDistanceKmGps
    _bgDistanceKm += calcDistanceKmGps([_bgLastPoint, point]);
  }
  _bgLastPoint = point;
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
  if (error) return;
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
    _addBgPoint(point);
  }
  // Await cue playback so the task stays alive until player.play() fires on native.
  // Without this await, iOS suspends JS before speakRunCue's async chain completes.
  await _checkBgMilestoneCues();
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface GpsTrackingState {
  path: GpsPoint[];
  distanceKm: number;
  elapsedSec: number;
  /** Latest reported speed in m/s, or null if unknown (foreground updates only). */
  speedMps: number | null;
  isTracking: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  start: () => Promise<void>;
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
        setSpeedMps(
          sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null,
        );
        const point: GpsPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          ...(loc.coords.accuracy != null && loc.coords.accuracy > 0
            ? { accuracy: loc.coords.accuracy }
            : {}),
        };
        // Update background-safe distance tracker and fire any due milestone cues.
        _addBgPoint(point);
        await _checkBgMilestoneCues();
        const updated = [...pathRef.current, point];
        pathRef.current = updated;
        setPath(updated);
        setDistanceKm(calcDistanceKmGps(updated));
      },
    );
  }, []);

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
      return;
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

    // Reset background-safe distance tracking for the new run.
    _bgDistanceKm = 0;
    _bgLastPoint = null;
    _bgSeenTimestamps.clear();

    accumulatedMsRef.current = 0;
    segmentStartMsRef.current = Date.now();
    setPath([]);
    setDistanceKm(0);
    setElapsedSec(0);
    setSpeedMps(null);
    setIsTracking(true);
    setIsPaused(false);
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
        _addBgPoint(point);
        const sp = last.coords.speed;
        setSpeedMps(
          sp != null && !Number.isNaN(sp) && sp >= 0 ? sp : null,
        );
      }
    } catch {
      // ignore
    }

    await _startForegroundWatcher();
    await _startBackgroundTask();

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
          _addBgPoint(point);
          pathRef.current = [point];
          setPath([point]);
          const sp = loc.coords.speed;
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

      // Merge any background points that arrived while app was minimised
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
          setDistanceKm(calcDistanceKmGps(merged));
        }
      }
    }, 1000);
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
    path,
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
  };
}
