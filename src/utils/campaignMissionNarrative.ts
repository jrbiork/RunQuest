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

const PURPOSE_LINES = [
  'You are the moving link — messages, meds, and warnings travel on your legs, not on radios the tribes can jam.',
  'Patrols from hostile camps sweep these corridors; speed and timing are the only cover you have.',
  'The settlement is one failed delivery away from blackout — your movement keeps relays and clinics alive.',
  'Every minute you stay on route buys the inner wards time to fortify and treat the sick.',
  'Scouts reported movement on the ridge: you need to be gone before their sweep closes the gap.',
  'This run is a handoff: what you carry is worth more than fuel — it is hope with a timestamp.',
  'Enemy spotters hunt lone carriers; rhythm and distance are your camouflage.',
  'The grid here is held together with tape and nerve — your effort is the spare part no one can stockpile.',
];

const TYPE_ANGLE: Record<MissionType, string> = {
  easy:
    'Hold an easy, sustainable effort — you should be able to speak in short sentences. Silence is risk out here.',
  tempo:
    'Hold a hard, steady threshold: the tower or relay you are feeding does not forgive a soft pace.',
  long:
    'Go long and controlled — supplies and intel need distance more than sprint heroics.',
  recovery:
    'Move light and observe — this is recon and recovery; loud effort draws the wrong eyes.',
  interval:
    'Hard surges then full recovery — like sprinting between cover while the sweep passes.',
};

/** Briefing + short TTS lines for any campaign mission row (unique per title + subtitle + campaign). */
export function narrativeForCampaignMission(
  type: MissionType,
  title: string,
  subtitle: string,
  campaignTitle: string,
): { description: string; audioCues: MissionAudioCueSet } {
  const k = seedKey([campaignTitle, title, subtitle, type]);
  const purpose = pick(PURPOSE_LINES, k);
  const angle = TYPE_ANGLE[type];

  const description = `${title}. ${subtitle} ${purpose} ${angle}`;

  const t = title.length > 32 ? title.slice(0, 30) + '…' : title;

  const pools: MissionAudioCueSet = {
    start: [
      `${t} live — ${subtitle} Move now, Survivor.`,
      `Deploy: ${t}. ${subtitle}`,
    ],
    quarter: [
      'First quarter — still on route. Hold the plan.',
      'Twenty-five percent — corridor quiet. Stay sharp.',
    ],
    half: [
      'Halfway — midpoint clear. Do not improvise the pace.',
      'Fifty percent — signal holding. You are still unseen.',
    ],
    threeQuarter: [
      'Three quarters — delivery window tightening. Finish clean.',
      'Seventy-five — almost home. No mistakes now.',
    ],
    complete: [
      `${t} signed off — the line holds another day.`,
      `Route complete. ${t} filed. You made the window.`,
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
