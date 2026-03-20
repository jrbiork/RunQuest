import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import type { GpsPoint } from '../types';
import { calcDistanceKm } from '../utils/haversine';

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

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Stable ref to latest path, used inside the location callback
  const pathRef = useRef<GpsPoint[]>([]);

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setHasPermission(false);
      return;
    }
    setHasPermission(true);

    // Reset state for fresh run
    pathRef.current = [];
    setPath([]);
    setDistanceKm(0);
    setElapsedSec(0);
    setIsTracking(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (startTimeRef.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,  // update every 5 metres
        timeInterval: 2000,   // at least every 2 s
      },
      (location) => {
        const newPoint: GpsPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        };
        const updated = [...pathRef.current, newPoint];
        pathRef.current = updated;
        setPath(updated);
        setDistanceKm(calcDistanceKm(updated));
      },
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, []);

  return { path, distanceKm, elapsedSec, isTracking, hasPermission, start, stop };
}
