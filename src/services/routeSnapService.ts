import type { ActivityMode, GpsPoint } from '../types';
import { calcDistanceKm } from '../utils/haversine';

const ORS_DIRECTIONS = 'https://api.openrouteservice.org/v2/directions';
const ORS_SNAP = 'https://api.openrouteservice.org/v2/snap';

/** ORS public directions API waypoint ceiling. */
const MAX_WAYPOINTS = 50;
const MAX_POINTS_SNAP_FALLBACK = 80;
const SNAP_RADIUS_M = 65;
/** Drop near-duplicate waypoints so ORS accepts the request. */
const MIN_WAYPOINT_GAP_KM = 0.002;

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

function sampleEvenly(points: GpsPoint[], max: number): GpsPoint[] {
  if (points.length <= max) return points;
  const out: GpsPoint[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    const idx = Math.round(i * step);
    out.push(points[Math.min(idx, points.length - 1)]!);
  }
  return out;
}

/** Ensures first/last are preserved; thins intermediates that are too close together. */
function spaceWaypoints(points: GpsPoint[]): GpsPoint[] {
  if (points.length <= 2) return points;
  const out: GpsPoint[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const prev = out[out.length - 1]!;
    if (calcDistanceKm([prev, p]) >= MIN_WAYPOINT_GAP_KM) out.push(p);
  }
  const end = points[points.length - 1]!;
  const prev = out[out.length - 1]!;
  if (calcDistanceKm([prev, end]) >= MIN_WAYPOINT_GAP_KM) out.push(end);
  else out[out.length - 1] = end;
  return out.length >= 2 ? out : points;
}

function lineStringCoords(geometry: unknown): [number, number][] | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const g = geometry as { type?: string; coordinates?: unknown };
  if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
    const c = g.coordinates as [number, number][];
    return c.length >= 2 ? c : null;
  }
  if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
    const parts = g.coordinates as [number, number][][];
    const flat = parts.flat();
    return flat.length >= 2 ? flat : null;
  }
  return null;
}

/** Concatenate LineString geometries from a FeatureCollection (e.g. per-leg features). */
function extractDirectionsCoordinates(data: unknown): [number, number][] | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { type?: string; features?: unknown[] };
  if (d.type !== 'FeatureCollection' || !Array.isArray(d.features)) return null;
  const all: [number, number][] = [];
  for (const f of d.features) {
    if (!f || typeof f !== 'object') continue;
    const geom = (f as { geometry?: unknown }).geometry;
    const coords = lineStringCoords(geom);
    if (!coords) continue;
    if (all.length === 0) {
      all.push(...coords);
      continue;
    }
    const bridgeA = all[all.length - 1]!;
    const bridgeB = coords[0]!;
    if (bridgeA[0] === bridgeB[0] && bridgeA[1] === bridgeB[1]) {
      all.push(...coords.slice(1));
    } else {
      all.push(...coords);
    }
  }
  return all.length >= 2 ? all : null;
}

async function fetchRoadGeometryFromDirections(
  waypoints: GpsPoint[],
  profile: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MapCoordinate[] | null> {
  if (waypoints.length < 2) return null;
  const coordinates = waypoints.map((p) => [p.longitude, p.latitude]);
  const res = await fetch(`${ORS_DIRECTIONS}/${profile}/geojson`, {
    method: 'POST',
    headers: {
      Authorization: apiKey.trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ coordinates }),
    signal,
  });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  const line = extractDirectionsCoordinates(data);
  if (!line) return null;
  return line.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

async function snapPointsChord(
  points: GpsPoint[],
  profile: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MapCoordinate[]> {
  const sampled = sampleEvenly(points, MAX_POINTS_SNAP_FALLBACK);
  const locations = sampled.map((p) => [p.longitude, p.latitude]);

  const res = await fetch(`${ORS_SNAP}/${profile}/json`, {
    method: 'POST',
    headers: {
      Authorization: apiKey.trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      locations,
      radius: SNAP_RADIUS_M,
    }),
    signal,
  });

  if (!res.ok) {
    return points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  }

  const data = (await res.json()) as {
    locations?: ({ location: [number, number] } | null)[];
  };
  const snapped = data.locations;
  if (!Array.isArray(snapped) || snapped.length !== sampled.length) {
    return points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  }

  const out: MapCoordinate[] = [];
  for (let i = 0; i < sampled.length; i++) {
    const s = snapped[i];
    if (s && s.location && Array.isArray(s.location) && s.location.length >= 2) {
      const [lng, lat] = s.location;
      out.push({ latitude: lat, longitude: lng });
    } else {
      const p = sampled[i]!;
      out.push({ latitude: p.latitude, longitude: p.longitude });
    }
  }
  return out;
}

/**
 * Builds a road-following polyline for map display.
 *
 * Priority order:
 *  1. ORS Directions (routing between waypoints — may cut corners at intersections)
 *  2. ORS Snap chord (per-point snap, straight lines between snapped points)
 *  3. Raw GPS
 */
export async function snapPathForMapDisplay(
  points: GpsPoint[],
  activityMode: ActivityMode,
  orsApiKey: string,
  signal?: AbortSignal,
): Promise<MapCoordinate[]> {
  const raw = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  if (points.length < 2) return raw;

  if (!orsApiKey.trim()) return raw;

  const profile = activityMode === 'cycle' ? 'cycling-regular' : 'foot-walking';

  // 1. ORS Directions (routing between sampled waypoints)
  try {
    const sampled = sampleEvenly(points, MAX_WAYPOINTS);
    const waypoints = spaceWaypoints(sampled);
    const routed = await fetchRoadGeometryFromDirections(waypoints, profile, orsApiKey, signal);
    if (routed && routed.length >= 2) return routed;
  } catch {
    // fall through
  }

  // 2. ORS Snap chord (per-point, no inter-point road geometry)
  try {
    return await snapPointsChord(points, profile, orsApiKey, signal);
  } catch {
    return raw;
  }
}
