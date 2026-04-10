import type { MissionType } from '../types';
import {
  MISSION_AUDIO_CUES,
  MISSION_COMPLETE_LIVE_CUE_LINES,
  MISSION_START_LIVE_CUE_TEMPLATES,
} from '../constants/missions';

/** Extra milestone lines bundled for offline playback (legacy campaign path). */
const EXTRA_BUNDLED_MILESTONE_CUES = {
  quarter: [
    'Twenty-five percent of target. Same effort.',
    'First quarter complete. Hold pace.',
  ],
  half: [
    'Half of target. No change in effort band.',
    'Midpoint. Continue as assigned.',
  ],
  threeQuarter: [
    'Seventy-five percent of target.',
    'Three quarters. Finish at same output.',
  ],
} as const;

/** Order matches iteration over `MISSION_AUDIO_CUES` by type. */
const MISSION_TYPES: readonly MissionType[] = [
  'easy',
  'tempo',
  'long',
  'recovery',
  'interval',
];

/** Expected unique static lines (start + complete + per-type milestones + extra milestones). */
export const EXPECTED_BUNDLED_RUN_CUE_COUNT = 64;

function buildBundledRunCueStrings(): readonly string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (s: string) => {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };

  for (const t of MISSION_START_LIVE_CUE_TEMPLATES) add(t);
  for (const t of MISSION_COMPLETE_LIVE_CUE_LINES) add(t);

  for (const type of MISSION_TYPES) {
    const c = MISSION_AUDIO_CUES[type];
    for (const s of c.quarter) add(s);
    for (const s of c.half) add(s);
    for (const s of c.threeQuarter) add(s);
  }

  for (const s of EXTRA_BUNDLED_MILESTONE_CUES.quarter) add(s);
  for (const s of EXTRA_BUNDLED_MILESTONE_CUES.half) add(s);
  for (const s of EXTRA_BUNDLED_MILESTONE_CUES.threeQuarter) add(s);

  return out;
}

export const bundledRunCueStrings: readonly string[] = buildBundledRunCueStrings();

if (process.env.NODE_ENV !== 'production') {
  if (bundledRunCueStrings.length !== EXPECTED_BUNDLED_RUN_CUE_COUNT) {
    // eslint-disable-next-line no-console
    console.warn(
      `[bundledRunCueStrings] expected ${EXPECTED_BUNDLED_RUN_CUE_COUNT} unique cues, got ${bundledRunCueStrings.length}`,
    );
  }
}

const textToIndex = new Map<string, number>(
  bundledRunCueStrings.map((text, i) => [text, i]),
);

/** Index of this line in `bundledRunCueStrings` / `RUN_CUE_REQUIRES`, or undefined if not bundled. */
export function getBundledRunCueIndex(line: string): number | undefined {
  return textToIndex.get(line);
}
