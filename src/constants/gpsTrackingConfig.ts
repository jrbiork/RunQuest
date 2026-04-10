/**
 * GPS run tracking tuning — distance jitter deadband (not haversine math).
 *
 * Micro-jitter suppression uses a stable “committed distance” anchor with
 * hysteresis so hand-to-hand motion / GPS wander does not inflate totals.
 */

/** Enter micro-jitter zone: at or inside this radius from last committed distance anchor → block distance. */
export const GPS_MICRO_JITTER_RADIUS_M = 1.5;

/**
 * Exit micro-jitter zone: must move at least this far from the committed anchor
 * while in the zone before normal distance accumulation resumes (prevents flapping).
 */
export const GPS_MICRO_JITTER_EXIT_RADIUS_M = 2.0;

/**
 * Background-only: apply micro-jitter only when horizontal accuracy is good enough
 * that sub‑2 m logic is meaningful. If worse than this, pass through raw distance.
 */
export const GPS_MICRO_JITTER_MAX_ACCURACY_M = 10;
