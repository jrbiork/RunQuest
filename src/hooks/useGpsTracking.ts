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
  hasPermission: boolean | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useGpsTracking(): GpsTrackingState {
  const [path, setPath] = useState<GpsPoint[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const fgSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pathRef = useRef<GpsPoint[]>([]);

  const stop = useCallback(async () => {
    // Stop foreground subscription
    fgSubscriptionRef.current?.remove();
    fgSubscriptionRef.current = null;

    // Stop background task
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch {
      // ignore — task may not be running
    }

    // Clear the background buffer so it doesn't bleed into the next run
    _backgroundBuffer.length = 0;

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const start = useCallback(async () => {
    // Request foreground permission first
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      setHasPermission(false);
      return;
    }

    // Request background permission (non-blocking — gracefully degrade if denied)
    let hasBg = false;
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      hasBg = bgStatus === 'granted';
    } catch {
      // expo-location may throw if already determined on some OS versions
    }

    setHasPermission(true);

    // Clear state for a fresh run
    pathRef.current = [];
    _backgroundBuffer.length = 0;
    setPath([]);
    setDistanceKm(0);
    setElapsedSec(0);
    setIsTracking(true);
    startTimeRef.current = Date.now();

    // ── Foreground subscription (high accuracy, real-time UI updates) ──────
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

    // ── Background task (keeps tracking when app is minimised) ────────────
    if (hasBg) {
      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 3000,
          // Show a persistent iOS notification so the system doesn't kill the task
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'RunQuest is tracking your run',
            notificationBody: 'Keep moving — your path is being recorded.',
            notificationColor: '#F68F4D',
          },
        });
      } catch {
        // Background task failed to start — foreground-only fallback still active
      }
    }

    // ── Timer: elapsed time + drain background buffer ─────────────────────
    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }

      // Merge any background points that arrived while app was minimised
      if (_backgroundBuffer.length > 0) {
        const newPoints = _backgroundBuffer.splice(0, _backgroundBuffer.length);
        // De-duplicate by timestamp (foreground and background may overlap briefly)
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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fgSubscriptionRef.current?.remove();
      if (timerRef.current !== null) clearInterval(timerRef.current);
      // Stop background task on unmount (safety net — active.tsx also calls stop())
      TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK).then((registered) => {
        if (registered) Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
      });
    };
  }, []);

  return { path, distanceKm, elapsedSec, isTracking, hasPermission, start, stop };
}
