/** Mission card: distance only — "3 km", "800 m", or "–". */
export function formatMissionTargetDistance(distanceKm: number): string {
  if (distanceKm < 0.01) return '–';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  const km =
    distanceKm % 1 === 0
      ? String(Math.round(distanceKm))
      : distanceKm.toFixed(1);
  return `${km} km`;
}

/** Min/km pace from distance and duration (running). */
export function formatPace(distKm: number, durMin: number): string {
  if (distKm < 0.01) return '–';
  const secPerKm = (durMin * 60) / distKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} min/km`;
}

/** Expected pace from mission distance + time (running). */
export function formatApproxRunPace(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01 || durationMin <= 0) return '–';
  return formatPace(distanceKm, durationMin);
}

/** Expected speed from target distance + duration (cycling). */
export function formatApproxCycleSpeed(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01 || durationMin <= 0) return '–';
  const kmh = distanceKm / (durationMin / 60);
  if (!Number.isFinite(kmh)) return '–';
  return `${kmh.toFixed(1)} km/h`;
}
