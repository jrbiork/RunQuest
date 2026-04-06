import type { GpsPoint } from '../types';

const EARTH_RADIUS_KM = 6371;

/**
 * Segments at or above this length (m) always count toward distance. Must stay in sync
 * with foreground `distanceInterval` in useGpsTracking (~2m) — a higher noise floor
 * would drop every segment and distance/pace stay at zero.
 */
const MIN_MOVEMENT_SEGMENT_M = 2;

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
 * Distance along a GPS path with drift suppression: ignores segments shorter than
 * a noise floor derived from reported accuracy (or a small fallback when accuracy is missing).
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

    if (segM >= MIN_MOVEMENT_SEGMENT_M) {
      total += segKm;
      continue;
    }

    const pa = prev.accuracy;
    const ca = curr.accuracy;
    if (pa != null && ca != null && pa > 0 && ca > 0) {
      const noiseFloorM = (pa + ca) * 0.25;
      if (segM < noiseFloorM) continue;
    } else if (segM < 1.2) {
      continue;
    }

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

/** Min distance (km) before average pace is meaningful — lowered for faster first readout. */
const MIN_DISTANCE_KM_FOR_PACE = 0.005;

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

/**
 * Live run HUD: hide pace when nearly stationary (GPS speed); otherwise average pace.
 */
export function formatPaceLiveDisplay(
  distanceKm: number,
  elapsedSec: number,
  speedMps: number | null,
): string {
  if (speedMps != null) {
    const kmh = speedMps * 3.6;
    if (kmh < PACE_STATIONARY_THRESHOLD_KMH) return '--';
  }
  return formatPace(distanceKm, elapsedSec);
}
