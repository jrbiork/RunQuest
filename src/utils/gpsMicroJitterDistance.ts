import type { GpsPoint } from '../types';
import {
  GPS_MICRO_JITTER_EXIT_RADIUS_M,
  GPS_MICRO_JITTER_RADIUS_M,
} from '../constants/gpsTrackingConfig';
import { haversineM } from './haversine';

export interface MicroJitterDistanceState {
  /** Last position where distance was committed (or seeded); null before first fix. */
  committedAnchor: GpsPoint | null;
  /** Hysteresis: true while inside the deadband until exit radius is reached. */
  inJitterZone: boolean;
}

/**
 * Applies anchor-based micro-jitter deadband + hysteresis to a raw distance increment.
 * Scope: distance totals only — caller keeps path / map logic separate.
 *
 * - When `microEnabled` is false, raw distance is passed through and the committed
 *   anchor follows successful raw segments (keeps state consistent).
 */
export function applyMicroJitterToDistanceDelta(input: {
  state: MicroJitterDistanceState;
  candidate: GpsPoint;
  rawAddedKm: number;
  microEnabled: boolean;
}): { effectiveKm: number; state: MicroJitterDistanceState } {
  const { candidate, rawAddedKm, microEnabled } = input;
  let { committedAnchor, inJitterZone } = input.state;

  if (!microEnabled) {
    if (committedAnchor === null) {
      return {
        effectiveKm: 0,
        state: { committedAnchor: candidate, inJitterZone: false },
      };
    }
    let nextAnchor = committedAnchor;
    let nextJitter = inJitterZone;
    if (rawAddedKm > 0) {
      nextAnchor = candidate;
      nextJitter = false;
    }
    return {
      effectiveKm: rawAddedKm,
      state: { committedAnchor: nextAnchor, inJitterZone: nextJitter },
    };
  }

  if (committedAnchor === null) {
    return {
      effectiveKm: 0,
      state: { committedAnchor: candidate, inJitterZone: false },
    };
  }

  const d = haversineM(committedAnchor, candidate);
  const enterM = GPS_MICRO_JITTER_RADIUS_M;
  const exitM = GPS_MICRO_JITTER_EXIT_RADIUS_M;

  if (inJitterZone) {
    if (d >= exitM) {
      if (rawAddedKm > 0) {
        return {
          effectiveKm: rawAddedKm,
          state: { committedAnchor: candidate, inJitterZone: false },
        };
      }
      return {
        effectiveKm: 0,
        state: { committedAnchor, inJitterZone: false },
      };
    }
    return {
      effectiveKm: 0,
      state: { committedAnchor, inJitterZone: true },
    };
  }

  if (d <= enterM) {
    return {
      effectiveKm: 0,
      state: { committedAnchor, inJitterZone: true },
    };
  }

  if (rawAddedKm > 0) {
    return {
      effectiveKm: rawAddedKm,
      state: { committedAnchor: candidate, inJitterZone: false },
    };
  }

  return {
    effectiveKm: 0,
    state: { committedAnchor, inJitterZone: false },
  };
}
