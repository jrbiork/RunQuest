import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { GpsPoint } from '../types';
import { calcDistanceKm } from '../utils/haversine';

// ─── Background task name ─────────────────────────────────────────────────────

export const BACKGROUND_LOCATION_TASK = 'runquest-background-location';

// ─── Shared buffer ────────────────────────────────────────────────────────────
// Points captured while the app is backgrounded are pushed here.
// The hook drains this buffer every second.

const _backgroundBuffer: GpsPoint[] = [];

// ─── Register background task (must be at module top-level, outside any component) ─

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const loc of locations) {
    _backgroundBuffer.push({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
    });
  }
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface GpsTrackingState {
  path: GpsPoint[];
  distanceKm: number;
  elapsedSec: number;
  isTracking: boolean;
  isPaused: boolean;
  hasPermission: boolean | null;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

export function useGpsTracking(): GpsTrackingState {
  const [path, setPath] = useState<GpsPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
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

  const _startForegroundWatcher = useCallback(async () => {
    fgSubscriptionRef.current?.remove();
    fgSubscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 2000,
      },
      (loc) => {
        const point: GpsPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        };
        const updated = [...pathRef.current, point];
        pathRef.current = updated;
        setPath(updated);
        setDistanceKm(calcDistanceKm(updated));
      },
    );
  }, []);

  const _startBackgroundTask = useCallback(async () => {
    if (!hasBgRef.current) return;
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 3000,
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
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
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
    setIsTracking(false);
    setIsPaused(false);
  }, [_stopLocationTracking]);

  const pause = useCallback(async () => {
    if (!isTracking || isPaused) return;
    // Capture elapsed time for this active segment
    if (segmentStartMsRef.current !== null) {
      accumulatedMsRef.current += Date.now() - segmentStartMsRef.current;
      segmentStartMsRef.current = null;
    }
    await _stopLocationTracking();
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
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setHasPermission(false);
      return;
    }

    let hasBg = false;
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      hasBg = bgStatus === 'granted';
    } catch {
      // expo-location may throw if already determined on some OS versions
    }
    hasBgRef.current = hasBg;

    setHasPermission(true);

    // Reset state for a fresh run
    pathRef.current = [];
    _backgroundBuffer.length = 0;
    accumulatedMsRef.current = 0;
    segmentStartMsRef.current = Date.now();
    setPath([]);
    setDistanceKm(0);
    setElapsedSec(0);
    setIsTracking(true);
    setIsPaused(false);

    await _startForegroundWatcher();
    await _startBackgroundTask();

    // ── Timer: elapsed time + drain background buffer ─────────────────────
    timerRef.current = setInterval(() => {
      // Only advance the clock while not paused
      if (segmentStartMsRef.current !== null) {
        const total = accumulatedMsRef.current + (Date.now() - segmentStartMsRef.current);
        setElapsedSec(Math.floor(total / 1000));
      }

      // Merge any background points that arrived while app was minimised
      if (_backgroundBuffer.length > 0) {
        const newPoints = _backgroundBuffer.splice(0, _backgroundBuffer.length);
        const existingTimestamps = new Set(pathRef.current.map((p) => p.timestamp));
        const unique = newPoints.filter((p) => !existingTimestamps.has(p.timestamp));
        if (unique.length > 0) {
          const merged = [...pathRef.current, ...unique].sort((a, b) => a.timestamp - b.timestamp);
          pathRef.current = merged;
          setPath(merged);
          setDistanceKm(calcDistanceKm(merged));
        }
      }
    }, 1000);
  }, [_startForegroundWatcher, _startBackgroundTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fgSubscriptionRef.current?.remove();
      if (timerRef.current !== null) clearInterval(timerRef.current);
      TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK).then((registered) => {
        if (registered) Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
      });
    };
  }, []);

  return { path, distanceKm, elapsedSec, isTracking, isPaused, hasPermission, start, stop, pause, resume };
}
