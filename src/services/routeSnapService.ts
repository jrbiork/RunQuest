import type { ActivityMode, GpsPoint } from '../types';

const ORS_BASE = 'https://api.openrouteservice.org/v2/snap';
/** ORS expects [lng, lat] order. */
const MAX_POINTS_PER_REQUEST = 80;
const SNAP_RADIUS_M = 65;

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

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Snaps GPS samples to the road graph for map display. Falls back to raw points on error or missing key.
 */
export async function snapPathForMapDisplay(
  points: GpsPoint[],
  activityMode: ActivityMode,
  apiKey: string,
  signal?: AbortSignal,
): Promise<MapCoordinate[]> {
  const raw = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  if (points.length < 2 || !apiKey.trim()) return raw;

  const profile = activityMode === 'cycle' ? 'cycling-regular' : 'foot-walking';
  const sampled = sampleEvenly(points, MAX_POINTS_PER_REQUEST);
  const locations = sampled.map((p) => [p.longitude, p.latitude]);

  try {
    const res = await fetch(`${ORS_BASE}/${profile}/json`, {
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

    if (!res.ok) return raw;

    const data = (await res.json()) as {
      locations?: ({ location: [number, number] } | null)[];
    };
    const snapped = data.locations;
    if (!Array.isArray(snapped) || snapped.length !== sampled.length) return raw;

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
  } catch {
    return raw;
  }
}
