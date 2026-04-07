import type { GpsPoint } from '../types';

const EARTH_RADIUS_KM = 6371;

/**
 * Minimum displacement (m) from the last *accepted* GPS position before a new fix
 * is counted as real movement. Stationary phone jitter (including iOS sensor-fusion
 * dead-reckoning from the accelerometer) can wander 8–12 m; 10 m rejects that.
 */
export const GPS_ANCHOR_MIN_M = 10;

/**
 * Implied speed cap (m/s) between two accepted fixes. Faster movement between
 * consecutive positions is almost certainly a GPS jump or sensor-fusion artifact
 * (e.g. shaking the phone). 7 m/s ≈ 25 km/h, above any realistic running pace.
 */
export const GPS_MAX_SPEED_MPS = 7;

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

function haversineKm(a: GpsPoint, b: GpsPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** Distance in metres between two GPS points. */
export function haversineM(a: GpsPoint, b: GpsPoint): number {
  return haversineKm(a, b) * 1000;
}

/**
 * Reject a GPS fix that is too inaccurate to be trusted.
 * Accuracy values > this are typical of indoor multipath / poor satellite geometry.
 */
export const GPS_MAX_ACCURACY_M = 15;

/**
 * One step of anchor-based GPS distance.
 *
 * A fix is accepted (anchor advances) only when ALL three gates pass:
 *   1. Distance from anchor ≥ GPS_ANCHOR_MIN_M  — rejects stationary jitter
 *   2. Implied speed ≤ GPS_MAX_SPEED_MPS        — rejects GPS jumps / phone shaking
 *
 * Returns `{ addedKm: 0, anchor }` (unchanged anchor) when a fix is rejected,
 * so the next fix is still measured against the last genuine position.
 */
export function advanceGpsDistanceAnchor(
  anchor: GpsPoint,
  curr: GpsPoint,
): { addedKm: number; anchor: GpsPoint } {
  const distM = haversineM(anchor, curr);
  if (distM < GPS_ANCHOR_MIN_M) {
    return { addedKm: 0, anchor };
  }
  // Use a minimum dt of 0.5 s to avoid divide-by-zero on duplicate timestamps.
  const dtSec = Math.max((curr.timestamp - anchor.timestamp) / 1000, 0.5);
  const impliedSpeedMps = distM / dtSec;
  if (impliedSpeedMps > GPS_MAX_SPEED_MPS) {
    // Likely a sensor-fusion jump (e.g. rapid phone movement detected by IMU).
    // Keep old anchor so the next fix is still evaluated from a stable position.
    return { addedKm: 0, anchor };
  }
  return { addedKm: distM / 1000, anchor: curr };
}

/**
 * Distance along a GPS path with anchor-based drift suppression: we only add
 * distance when the path moves at least ~5 m from the last counted position.
 * Rejects stationary zigzag jitter that passes short per-segment thresholds.
 */
export function calcDistanceKmGps(coords: GpsPoint[]): number {
  if (coords.length < 2) return 0;

  let total = 0;
  let anchor = coords[0]!;
  for (let i = 1; i < coords.length; i++) {
    const curr = coords[i]!;
    const { addedKm, anchor: next } = advanceGpsDistanceAnchor(anchor, curr);
    total += addedKm;
    anchor = next;
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
