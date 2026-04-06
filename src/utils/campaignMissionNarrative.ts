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

/** Assignment context — objective, no filler. Large pools keep combined briefings unique. */
const STAKES_A = [
  'Orders: move the sealed crate from the loading bay to the address on the dispatch card.',
  'Assignment: deliver meal packs to the intake desk before the serving window ends.',
  'Tasking: carry the coolant bag from the clinic to the lab courier slot.',
  'Manifest: transport binders from admin to the field office for signature.',
  'Route sheet: pick up parts at the depot and drop at the maintenance bay.',
  'Directive: escort the visitor pass holder from the gate to Building C.',
  'Orders: run the perimeter check and radio each checkpoint ID in order.',
  'Assignment: move sandbags from the pile to the flood wall as listed.',
  'Tasking: deliver keys to the lockbox at the north shelter.',
  'Manifest: take the sample kit to the testing trailer; chain of custody form attached.',
  'Route sheet: relay the printed schedule to each station supervisor.',
  'Directive: move the radio battery set to the forward observation post.',
  'Orders: deliver uniforms to the quartermaster window; receipt required.',
  'Assignment: transport water jugs to the staging tent; count on delivery.',
  'Tasking: carry the signed permits from the courthouse to the operations desk.',
  'Manifest: move the tool roll from the cage to the repair truck.',
  'Route sheet: hand off the clipboard bundle at each stop; no skips.',
  'Directive: deliver the cold pack to the medic tent before melt time.',
  'Orders: move the traffic cones from storage to the marked lane.',
  'Assignment: take the ID badges to the security office for activation.',
];

const STAKES_B = [
  'No alternate runner is assigned to this leg.',
  'The window closes at the stated distance or duration target.',
  'Supervisor must receive confirmation before the cutoff.',
  'Late delivery requires a written incident report.',
  'One trip; split loads are not authorized.',
  'GPS log is the record of completion.',
  'Incomplete segments roll to the next shift unpaid.',
  'Hold the listed effort band for the full target.',
  'Weather is not grounds to shorten the assigned segment.',
  'Rest stops do not pause the target clock unless ordered.',
  'Substitutions must be approved by dispatch.',
  'Return the empty containers on the same route if instructed.',
  'Signature or scan required at the final stop.',
  'Deviation from the route sheet needs radio clearance.',
  'Pace and duration are fixed by mission type.',
  'Equipment damage is charged to the assigned runner.',
  'Noise discipline applies near the marked zones.',
  'Fuel and gear are drawn only at listed points.',
  'After-action notes go to the same inbox as the manifest.',
  'The board shows this as the active segment until closed.',
];

/** One clear movement instruction per type (read while moving). */
const THE_WORK: Record<MissionType, string> = {
  easy:
    'Execution: easy pace — steady breathing, full sentences. Cover the target distance or time without surging.',
  tempo:
    'Execution: one sustained hard effort for the full duration — strong, not an all-out sprint.',
  long:
    'Execution: easy endurance pace for the full distance or time. Do not race early.',
  recovery:
    'Execution: light jog or shuffle. Low effort; complete the full distance or time.',
  interval:
    'Execution: hard work segments with full recovery between. Do not mix paces within a segment.',
};

/**
 * Static milestone copy used for campaign missions (bundled MP3s + `narrativeForCampaignMission` pools).
 * Start/complete pools remain dynamic (title/subtitle).
 */
export const CAMPAIGN_BUNDLED_MILESTONE_CUES = {
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
      `${t}. ${subtitle} Begin movement.`,
      `Start segment: ${t}. ${subtitle}`,
    ],
    quarter: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.quarter],
    half: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.half],
    threeQuarter: [...CAMPAIGN_BUNDLED_MILESTONE_CUES.threeQuarter],
    complete: [
      `${t} complete. Segment logged.`,
      `${t} closed. Target recorded.`,
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
