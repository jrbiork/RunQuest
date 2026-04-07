import type { GpsPoint } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Never count a segment shorter than this (m). */
const GPS_MIN_SEGMENT_M = 1;

/**
 * Accuracy-based noise (m) is capped so it never exceeds a typical foreground GPS
 * step (~2 m from `distanceInterval`). Uncapped, poor fixes (20–50 m accuracy)
 * produced floors of 10–25 m and rejected every segment — distance stayed at 0.
 */
const GPS_NOISE_FLOOR_MAX_M = 2;

function segmentNoiseFloorM(prev: GpsPoint, curr: GpsPoint): number {
  const pa = prev.accuracy;
  const ca = curr.accuracy;
  let raw: number;
  if (pa != null && ca != null && pa > 0 && ca > 0) {
    raw = (pa + ca) * 0.25;
  } else if (pa != null && pa > 0) {
    raw = pa * 0.25;
  } else if (ca != null && ca > 0) {
    raw = ca * 0.25;
  } else {
    return GPS_MIN_SEGMENT_M;
  }
  const capped = Math.min(raw, GPS_NOISE_FLOOR_MAX_M);
  return Math.max(GPS_MIN_SEGMENT_M, capped);
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the total distance in kilometres along a path of GPS coordinates
 * using the Haversine formula between each consecutive pair of points.
 */
export function calcDistanceKm(coords: GpsPoint[]): number {
  if (coords.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!;
    const curr = coords[i]!;

    const dLat = toRad(curr.latitude - prev.latitude);
    const dLon = toRad(curr.longitude - prev.longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(prev.latitude)) *
        Math.cos(toRad(curr.latitude)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += EARTH_RADIUS_KM * c;
  }

  return total;
}

/**
 * Distance along a GPS path with drift suppression: each segment counts only if its
 * length (m) meets at least a 1 m minimum and an accuracy-based floor (capped at 2 m).
 * Independent of `distanceInterval` (update frequency only).
 */
export function calcDistanceKmGps(coords: GpsPoint[]): number {
  if (coords.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!;
    const curr = coords[i]!;

    const dLat = toRad(curr.latitude - prev.latitude);
    const dLon = toRad(curr.longitude - prev.longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(prev.latitude)) *
        Math.cos(toRad(curr.latitude)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const segKm = EARTH_RADIUS_KM * c;
    const segM = segKm * 1000;

    const floorM = segmentNoiseFloorM(prev, curr);
    if (segM < floorM) continue;

    total += segKm;
  }

  return total;
}

/** Format elapsed seconds as MM:SS */
export function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Min distance (km) before pace readouts are meaningful (~3 m). */
const MIN_DISTANCE_KM_FOR_PACE = 0.003;

/** Rolling window for live “current” pace on the map HUD (~30–60 s). */
export const LIVE_PACE_WINDOW_MS = 45_000;

/** Min span inside the window (s) before pace is trusted. */
const LIVE_PACE_MIN_WINDOW_SEC = 4;

/** Below this ground speed (km/h), live HUD shows stationary pace (uses GPS speed when available). */
export const PACE_STATIONARY_THRESHOLD_KMH = 1.5;

/** Format pace as min/km string, e.g. "5:30 /km" */
export function formatPace(distanceKm: number, elapsedSec: number): string {
  if (distanceKm < MIN_DISTANCE_KM_FOR_PACE) return '--:-- /km';
  const paceSecPerKm = elapsedSec / distanceKm;
  const paceMins = Math.floor(paceSecPerKm / 60);
  const paceSecs = Math.floor(paceSecPerKm % 60);
  return `${paceMins}:${String(paceSecs).padStart(2, '0')} /km`;
}

function formatPaceFromSecPerKm(paceSecPerKm: number): string {
  const paceMins = Math.floor(paceSecPerKm / 60);
  const paceSecs = Math.floor(paceSecPerKm % 60);
  return `${paceMins}:${String(paceSecs).padStart(2, '0')} /km`;
}

/**
 * Pace (seconds per km) from GPS points in [nowMs - windowMs, nowMs], using the same
 * distance rules as totals. Returns null if the window is too short or sparse.
 */
export function calcPaceSecPerKmWindow(
  coords: GpsPoint[],
  nowMs: number,
  windowMs: number,
): number | null {
  if (coords.length < 2) return null;
  const cutoff = nowMs - windowMs;
  let start = 0;
  while (start < coords.length && coords[start]!.timestamp < cutoff) {
    start += 1;
  }
  const slice = coords.slice(start);
  if (slice.length < 2) return null;
  const t0 = slice[0]!.timestamp;
  const t1 = slice[slice.length - 1]!.timestamp;
  const dtSec = (t1 - t0) / 1000;
  if (dtSec < LIVE_PACE_MIN_WINDOW_SEC) return null;
  const distKm = calcDistanceKmGps(slice);
  if (distKm < MIN_DISTANCE_KM_FOR_PACE) return null;
  const impliedKmh = (distKm / dtSec) * 3600;
  if (impliedKmh < PACE_STATIONARY_THRESHOLD_KMH) return null;
  return dtSec / distKm;
}

/**
 * Live run HUD: stationary → '--'; else recent-window pace when available; else session average.
 */
export function formatPaceLiveDisplay(
  path: GpsPoint[],
  distanceKm: number,
  elapsedSec: number,
  speedMps: number | null,
  nowMs: number = Date.now(),
): string {
  if (speedMps != null) {
    const kmh = speedMps * 3.6;
    if (kmh < PACE_STATIONARY_THRESHOLD_KMH) return '--';
  }
  const windowSecPerKm = calcPaceSecPerKmWindow(
    path,
    nowMs,
    LIVE_PACE_WINDOW_MS,
  );
  if (windowSecPerKm != null && Number.isFinite(windowSecPerKm)) {
    return formatPaceFromSecPerKm(windowSecPerKm);
  }
  return formatPace(distanceKm, elapsedSec);
}
