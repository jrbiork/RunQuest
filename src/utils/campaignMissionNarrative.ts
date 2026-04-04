import type { MissionAudioCueSet, MissionType } from '../types';

/** Stable hash for picking copy variants from mission + campaign context. */
function seedKey(parts: string[]): number {
  const s = parts.join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

/** Two rotating stakes lines — tense, no filler. */
const STAKES_A = [
  'Grid flickered again. Nobody else is coming out.',
  'Last relay before the ward goes quiet.',
  'Jammers own the air — your legs are the wire.',
  'Storm front’s close. You move or the route dies.',
  'Scouts saw heat on the ridge. Small window.',
  'Fuel’s gone. Meds don’t walk themselves.',
  'Tower’s begging for a carrier wave. You’re it.',
  'Blackout spreads block by block. Clock’s real.',
];

const STAKES_B = [
  'If you stall, people downstream eat static.',
  'They’re counting minutes, not excuses.',
  'No second truck. No backup run.',
  'Silence on the line means you didn’t show.',
  'Every second you wait, the corridor cools.',
];

/** One clear movement instruction per type (read while moving). */
const THE_WORK: Record<MissionType, string> = {
  easy:
    'Run easy — steady breath, pace you could talk through. Hit the target distance or time without surging.',
  tempo:
    'Hold one hard, steady effort the whole way: strong, not a sprint. Lock in until the duration ends.',
  long:
    'Go long at an easy endurance pace. Bank miles; don’t race the clock early.',
  recovery:
    'Jog or shuffle light. Low effort, keep moving — this is motion, not a workout PR.',
  interval:
    'Hard intervals, real recovery between. Each push is full gas; each easy segment is actually easy.',
};

/**
 * Static milestone copy used for campaign missions (bundled MP3s + `narrativeForCampaignMission` pools).
 * Start/complete pools remain dynamic (title/subtitle).
 */
export const CAMPAIGN_BUNDLED_MILESTONE_CUES = {
  quarter: [
    'Quarter down. Hold the plan.',
    'Twenty-five percent. Stay on task.',
  ],
  half: [
    'Halfway. Don’t improvise — same effort.',
    'Midpoint. Pace holds.',
  ],
  threeQuarter: [
    'Three quarters. Close it clean.',
    'Last stretch. No drift.',
  ],
} as const;

/** Briefing + in-run TTS for campaign missions (no long concatenated fluff). */
export function narrativeForCampaignMission(
  type: MissionType,
  title: string,
  subtitle: string,
  campaignTitle: string,
): { description: string; audioCues: MissionAudioCueSet } {
  const k = seedKey([campaignTitle, title, subtitle, type]);
  const a = pick(STAKES_A, k);
  const b = pick(STAKES_B, k + 2);
  const work = THE_WORK[type];
  const description = `${a} ${b} ${work}`;

  const t = title.length > 32 ? title.slice(0, 30) + '…' : title;

  const pools: MissionAudioCueSet = {
    start: [
      `${t}. ${subtitle} Go now.`,
      `Out the door — ${t}. ${subtitle}`,
    ],
    quarter: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.quarter],
    half: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.half],
    threeQuarter: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.threeQuarter],
    complete: [
      `${t} — done. Line holds.`,
      `Logged. ${t} closed.`,
    ],
  };

  return {
    description,
    audioCues: {
      start: [pick(pools.start, k)],
      quarter: [pick(pools.quarter, k + 1)],
      half: [pick(pools.half, k + 2)],
      threeQuarter: [pick(pools.threeQuarter, k + 3)],
      complete: [pick(pools.complete, k + 4)],
    },
  };
}
