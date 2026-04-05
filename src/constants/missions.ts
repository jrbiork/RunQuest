import type { Mission, MissionType, MissionAudioCueSet } from '../types';

// ─── Mission Microcopy Templates ─────────────────────────────────────────────

/** Aligned title, subtitle, briefing, and optional in-run cues for legacy week missions. */
export interface MissionTemplateVariant {
  title: string;
  subtitle: string;
  description: string;
  audioCues?: MissionAudioCueSet;
}

export interface MissionTemplate {
  type: MissionType;
  titles: string[];
  subtitles: string[];
  descriptions: string[];
  /** When set, buildMission picks one variant so title, subtitle, and briefing align. */
  variants?: MissionTemplateVariant[];
  motivationalFraming: string[];
  completionMessages: string[];
}

export const MISSION_TEMPLATES: Record<MissionType, MissionTemplate> = {
  easy: {
    type: 'easy',
    titles: [
      'Restore Sector 4',
      'Grid Patrol Run',
      'Power Line Check',
      'Charge the Grid',
    ],
    subtitles: [
      'Dead line in Sector 4. Your feet power the splice.',
      'Walk the grid. Every step feeds the zone.',
      'Slow is fine. Stopping isn’t.',
      'No surge. Just keep the signal alive.',
    ],
    descriptions: [
      'Lines are cold; hospitals are guessing. Run easy — you could talk in full sentences — and hold it until distance or time is done. Go now.',
      'Flicker on the trunk means you move before the cut goes total. Steady easy pace, no hero kick. Finish the target breathing under control.',
    ],
    variants: [
      {
        title: 'Restore Sector 4',
        subtitle: 'Dead line in Sector 4. Your feet power the splice.',
        description:
          'Sector 4 is brownout. You’re the patch: run easy and even, talk-test effort, until you hit the target. Surge once and the splice fails.',
      },
      {
        title: 'Grid Patrol Run',
        subtitle: 'Walk the grid. Every step feeds the zone.',
        description:
          'Patrol maps which blocks die next. Hold one comfortable easy gear the whole way. Cover the distance or time — no racing, no walking unless you must.',
      },
      {
        title: 'Power Line Check',
        subtitle: 'Slow is fine. Stopping isn’t.',
        description:
          'Trunk line’s unspooling heat. Keep moving easy while you log breaks — slow feet, eyes up. Match the target at a pace you could hold all day.',
      },
      {
        title: 'Charge the Grid',
        subtitle: 'No surge. Just keep the signal alive.',
        description:
          'Grid’s gasping. Your job: easy sustained motion until the clock or miles are banked. Breathe through the nose if you can; don’t lift the pace.',
      },
    ],
    motivationalFraming: [
      'Every kilometer restores another block.',
      'The grid goes dark without you. Keep moving.',
      "Show up. That's the mission.",
    ],
    completionMessages: [
      'Grid restored. Sector 4 is back online.',
      'Power restored. The lights are coming on.',
      'Steady run complete. Another block reconnected.',
    ],
  },
  tempo: {
    type: 'tempo',
    titles: [
      'Boost the Tower',
      'Signal Rush Protocol',
      'Reconnect the Network',
      'Hold the Frequency',
    ],
    subtitles: [
      'Tower’s dying. One hard push locks the band.',
      'Jamming climbs by the second. Don’t back off.',
      'Hold the line or three camps go dark.',
    ],
    descriptions: [
      'Carrier’s almost gone. Run at a hard steady effort — tough talk, not sprint — for the full duration. Ease up and the tower drops.',
      'This is threshold: one gear, locked in. Stay uncomfortable but controlled until time’s up. No surges, no jogging — hold the burn.',
    ],
    variants: [
      {
        title: 'Boost the Tower',
        subtitle: 'Tower’s dying. One hard push locks the band.',
        description:
          'Outposts are on static. You hold one sustained hard pace — think “hard hour,” not sprint — until the window closes. Drift softer and the link dies.',
      },
      {
        title: 'Signal Rush Protocol',
        subtitle: 'Jamming climbs by the second. Don’t back off.',
        description:
          'Noise is eating the band. Stay at threshold the whole run: legs heavy, breathing hard, still under control. Quit early and camps lose voice.',
      },
      {
        title: 'Reconnect the Network',
        subtitle: 'Hold the line or three camps go dark.',
        description:
          'Three settlements wait on this frequency. Lock a hard steady effort and don’t gift them recovery — hold pace until the duration ends.',
      },
      {
        title: 'Hold the Frequency',
        subtitle: 'Jamming climbs by the second. Don’t back off.',
        description:
          'One bar left on the tower. You run uncomfortable-on-purpose for the full time. No coasting: the signal only lives while you stay in it.',
      },
    ],
    motivationalFraming: [
      'The signal gets stronger as you push.',
      'Zones are counting on this connection.',
      "Embrace the push — it's progress.",
    ],
    completionMessages: [
      'Tower online. Signal restored to full strength.',
      'Frequency locked. Three more zones can communicate now.',
      'Threshold run complete. Network expanding.',
    ],
  },
  long: {
    type: 'long',
    titles: [
      'Cross-Zone Delivery',
      'Medical Supply Run',
      'The Long Haul',
      'Outlander Route',
    ],
    subtitles: [
      'Cold chain doesn’t wait. Miles beat speed.',
      'Go slow. Go far. People are counting.',
      'Longest leg of the week — pace, don’t race.',
    ],
    descriptions: [
      'Clinic’s out of reach by road. You go easy and long — full distance or time at a pace you could repeat tomorrow. Banking speed early wastes the haul.',
      'Supplies move on legs now. Run steady endurance: comfortable, patient, until the target’s done. Save the kick — there isn’t one.',
    ],
    variants: [
      {
        title: 'Cross-Zone Delivery',
        subtitle: 'Cold chain doesn’t wait. Miles beat speed.',
        description:
          'Pack has to clear three zones before heat wins. Run easy the whole way — finish the full distance or duration without turning it into a tempo day.',
      },
      {
        title: 'Medical Supply Run',
        subtitle: 'Go slow. Go far. People are counting.',
        description:
          'Relay’s at the far clinic. Hold an easy aerobic pace; if you’re panting, you’re wrong. Get the miles in before the window shuts.',
      },
      {
        title: 'The Long Haul',
        subtitle: 'Longest leg of the week — pace, don’t race.',
        description:
          'This is the week’s anchor. Go long, stay relaxed, eat the clock on your feet. No surges — empty the tank slow and steady.',
      },
      {
        title: 'Outlander Route',
        subtitle: 'Go slow. Go far. People are counting.',
        description:
          'Ruins don’t forgive bad pacing. Start easy, stay easy, finish the full route. Last third still feels like “I could keep going.”',
      },
    ],
    motivationalFraming: [
      'The farther you go, the more zones you open.',
      'People are waiting at the other end.',
      'Unlock endurance. Unlock the world.',
    ],
    completionMessages: [
      'Delivery complete. Zone 7 has what it needs.',
      'Long route finished. You opened new territory.',
      'Distance conquered. Endurance level rising.',
    ],
  },
  recovery: {
    type: 'recovery',
    titles: [
      'Recon the Perimeter',
      'Survey the Damage',
      'Scout Patrol',
      'Zone Assessment',
    ],
    subtitles: [
      'Wire’s quiet. Eyes open, legs soft.',
      'Slow enough to shame you. That’s correct.',
      'Move. Don’t grind.',
    ],
    descriptions: [
      'Perimeter’s a mess and command needs eyes. Jog barely faster than a walk — full target at low effort. You’re scanning, not racing.',
      'Legs are trash from last week; today you flush them. Easy shuffle or jog, full duration or distance, heart rate stays down.',
    ],
    variants: [
      {
        title: 'Recon the Perimeter',
        subtitle: 'Wire’s quiet. Eyes open, legs soft.',
        description:
          'Walk the fence and log what moved overnight. Keep effort stupid-easy — if you’re breathing hard, you’re lying. Finish the time or miles awake, not fast.',
      },
      {
        title: 'Survey the Damage',
        subtitle: 'Slow enough to shame you. That’s correct.',
        description:
          'Council needs choke points, not heroics. Creep along at a pace you’d use on a hangover. Cover the target; ego stays home.',
      },
      {
        title: 'Scout Patrol',
        subtitle: 'Move. Don’t grind.',
        description:
          'Streak stays alive on motion, not pain. Light jog or brisk shuffle the whole way. Save the hard day for tomorrow.',
      },
      {
        title: 'Zone Assessment',
        subtitle: 'Wire’s quiet. Eyes open, legs soft.',
        description:
          'Soft sweep near the wire: note movement, don’t trigger it. Easy pace only — you’re collecting detail, not dropping splits.',
      },
    ],
    motivationalFraming: [
      'Recovery is how you survive the long game.',
      'Scouts move smart, not fast.',
      'Protect the streak. Protect the mission.',
    ],
    completionMessages: [
      'Recon complete. The perimeter is mapped.',
      'Scout patrol done. Intel acquired.',
      'Recovery run finished. Back stronger tomorrow.',
    ],
  },
  interval: {
    type: 'interval',
    titles: [
      'Surge Protocol',
      'Outrun the Storm',
      'Anomaly Response',
      'Emergency Sprint',
    ],
    subtitles: [
      'Front’s moving. Hard, then hide. Repeat.',
      'Short gas, long rest. No lazy reps.',
      'Speed buys minutes. Waste none.',
    ],
    descriptions: [
      'Whatever’s behind you doesn’t jog. Run work intervals all-out honest, recover until you’re ready for the next, repeat until the set’s done.',
      'Intervals only work if the easy parts are truly easy. Hard pieces: max effort. Recovery: slow enough to talk. No blending the two.',
    ],
    variants: [
      {
        title: 'Surge Protocol',
        subtitle: 'Front’s moving. Hard, then hide. Repeat.',
        description:
          'Anomaly’s widening. Each work interval you run like it’s the last bus — full send. Jog or walk the recoveries; half-effort recoveries waste the set.',
      },
      {
        title: 'Outrun the Storm',
        subtitle: 'Short gas, long rest. No lazy reps.',
        description:
          'Toxic air’s on a timer. Surge hard on every work rep, then actually slow down before the next. Sloppy pacing gets people left behind.',
      },
      {
        title: 'Anomaly Response',
        subtitle: 'Speed buys minutes. Waste none.',
        description:
          'Alternate brutal with boring: hard interval, easy interval, no mixing. Finish every work rep at race effort; easy reps are for breathing, not posing.',
      },
      {
        title: 'Emergency Sprint',
        subtitle: 'Short gas, long rest. No lazy reps.',
        description:
          'Alarm means you spike, reset, spike again. Max honest effort when it’s “go,” real rest when it’s not. Half-speed work reps don’t count.',
      },
    ],
    motivationalFraming: [
      'Speed activated. Zones are counting on it.',
      'Push hard. Recover. Repeat.',
      'Maximum effort. Maximum impact.',
    ],
    completionMessages: [
      'Surge complete. Anomaly suppressed.',
      'Sprint protocol finished. Speed capacity upgraded.',
      'Intervals crushed. Operational range expanded.',
    ],
  },
};

// ─── In-Run Audio Cues per Mission Type ──────────────────────────────────────
// Fallback when mission.audioCues is unset. Short lines — one sentence each. Survivor address.

/** Pick a random line from a cue variants array. */
export function pickCue(variants: string[]): string {
  return (
    variants[Math.floor(Math.random() * variants.length)] ?? variants[0] ?? ''
  );
}

/** First cue when map mission tracking starts (running/cycling) — static lines, no mission title. */
export const MISSION_START_LIVE_CUE_TEMPLATES = [
  'Mission live. Move now.',
  'Mission starting. Stay sharp—go.',
  'You’re live. Go, go.',
  'You’re up. Move.',
  'Window open. Go now.',
  'On you now. Move.',
  'Time’s running. Go.',
] as const;

/** First cue when map mission tracking starts (running/cycling). */
export function buildMissionStartLiveCue(): string {
  return pickCue([...MISSION_START_LIVE_CUE_TEMPLATES]);
}

export const MISSION_COMPLETE_LIVE_CUE_LINES = [
  'Objective achieved. You’re getting stronger. Don’t stop now.',
  'Target reached. That’s how it’s done. Queue the next mission.',
  'Mission completed. Ready for the next?',
  'Mission complete. You delivered. Keep stacking them.',
  'Mission complete. Progress locked in. Stay in motion.',
  'Mission complete. Clean execution. You earned this—what’s next?',
] as const;

/** Cue when the mission objective is reached on the map. */
export function pickMissionCompleteLiveCue(): string {
  return pickCue([...MISSION_COMPLETE_LIVE_CUE_LINES]);
}

export const MISSION_AUDIO_CUES: Record<MissionType, MissionAudioCueSet> = {
  easy: {
    start: [
      'Patrol live, Survivor. Easy pace — let the grid feel you.',
      'Zone sweep: hold a pace you can talk through.',
      'Quiet roads. Steady feet. The sector needs this rhythm.',
    ],
    quarter: [
      'First quarter clear. Hold the line — no rush.',
      'Twenty-five percent. Grid responding. Stay light.',
      'Quarter down. Same easy effort all the way.',
    ],
    half: [
      'Halfway. Power climbing — keep it comfortable.',
      'Mid patrol. Your rhythm is holding the zone.',
      'Fifty percent. Breathe easy; the mission is the pace.',
    ],
    threeQuarter: [
      'Three quarters. Lights ahead — stay smooth.',
      'Last stretch of sweep. Do not surge yet.',
      'Seventy-five. Finish steady, Survivor.',
    ],
    complete: [
      'Patrol done. Sector holds. Good work.',
      'Grid stable. You brought the power back.',
      'Mission filed. Base fitness in the bank.',
    ],
  },

  tempo: {
    start: [
      'Signal push, Survivor. Threshold effort — hold it.',
      'Tower run: hard and controlled. No backing off.',
      'This should bite. That is the tower coming online.',
    ],
    quarter: [
      'Twenty-five percent signal. Stay at threshold.',
      'Quarter in. Hard stays hard — hold frequency.',
      'First leg locked. Do not ease off.',
    ],
    half: [
      'Halfway through the burn. Stay in it.',
      'Mid push. Pain is the job — hold pace.',
      'Fifty percent. Tower still needs full output.',
    ],
    threeQuarter: [
      'Three quarters. Dig in — no drop now.',
      'Last quarter. Everything you have left on the line.',
      'Seventy-five. One more locked surge to the end.',
    ],
    complete: [
      'Tower live. Threshold locked. You held it.',
      'Signal full. Network breathes again.',
      'Hard done. Your ceiling just moved.',
    ],
  },

  long: {
    start: [
      'Long haul, Survivor. Start easy — miles matter.',
      'Delivery run: conserve early; you will need it.',
      'Endurance leg. Settle in for the distance.',
    ],
    quarter: [
      'First zone behind you. Stay relaxed.',
      'Twenty-five. Save the legs — long game.',
      'Quarter done. Pace should still feel easy.',
    ],
    half: [
      'Halfway. Check legs and breath — stay patient.',
      'Mid route. The load is endurance now.',
      'Fifty percent. Hold steady; home is earned.',
    ],
    threeQuarter: [
      'Three quarters. Bring it home — stay strong.',
      'Last leg. You carried this far; finish clean.',
      'Seventy-five. One push to delivery.',
    ],
    complete: [
      'Route closed. Endurance filed — you expanded range.',
      'Delivery logged. The distance was the mission.',
      'Long run done. The wasteland got shorter today.',
    ],
  },

  recovery: {
    start: [
      'Recovery sweep, Survivor. Easy is the whole job.',
      'Light feet today. Let the body rebuild.',
      'Scout pace only — heal, do not hero.',
    ],
    quarter: [
      'Quarter done. Stay gentle — that is correct.',
      'Perimeter soft. Keep it slow.',
      'Twenty-five. Recovery pace holds.',
    ],
    half: [
      'Halfway. Blood moving — still no rush.',
      'Mid sweep. Smart and slow wins today.',
      'Fifty. Tension down; keep the easy line.',
    ],
    threeQuarter: [
      'Three quarters. Light to the finish.',
      'Almost there. No kick — just close it easy.',
      'Seventy-five. Recovery almost filed.',
    ],
    complete: [
      'Sweep done. Body reset — well played.',
      'Recon filed. You earned the next hard day.',
      'Recovery complete. Smart Survivor work.',
    ],
  },

  interval: {
    start: [
      'Surge protocol. Hard, then easy — repeat.',
      'Intervals live. First burst hits now, Survivor.',
      'Speed work: max surge, then flush it out.',
    ],
    quarter: [
      'First block down. Recover — next surge loads.',
      'Twenty-five. Pattern holds: hit, breathe, repeat.',
      'Quarter in. Quality on every surge.',
    ],
    half: [
      'Halfway. Anomaly still moving — stay sharp.',
      'Mid set. Each burst trains a faster you.',
      'Fifty. Surges stay honest — no sandbagging.',
    ],
    threeQuarter: [
      'Three quarters. Last bursts — all out.',
      'Final set. Empty the tank on the work reps.',
      'Seventy-five. Finish the protocol clean.',
    ],
    complete: [
      'Surges complete. Speed logged. You held the pattern.',
      'Intervals done. Fast twitch earned today.',
      'Protocol closed. You outran the storm.',
    ],
  },
};

// ─── Post-Run World Impact Messages ──────────────────────────────────────────

export const MISSION_IMPACT_MESSAGES: Record<MissionType, string[]> = {
  easy: [
    'Power grid restored in Sector 4. Lights are back on.',
    'Grid Patrol complete. Another block reconnected.',
    'Sector energy levels rising. Keep patrolling.',
  ],
  tempo: [
    'Comm tower online. Signal restored to full strength.',
    'Network connection established. Three zones can communicate.',
    'Frequency locked. The outposts are talking again.',
  ],
  long: [
    'Cross-zone delivery complete. Survivors have what they need.',
    'Medical supplies delivered. Zone 7 is stabilizing.',
    'Long route cleared. New territory unlocked.',
  ],
  recovery: [
    'Perimeter assessed. The zone is holding.',
    'Scout patrol complete. Intel filed.',
    'Recon done. Survivors now know the safe routes.',
  ],
  interval: [
    'Surge protocol complete. Anomaly contained.',
    'Emergency sprint finished. Zone secured.',
    'Speed burst mission done. Operational range expanded.',
  ],
};

// ─── Motivational Greetings (Home screen) ─────────────────────────────────────

export const GREETINGS_BY_TIME = {
  morning: [
    'Dawn patrol. Zones need you.',
    'First light. The world is waiting.',
    'Morning runner. The grid wakes with you.',
  ],
  afternoon: [
    'Midday mission. Lace up.',
    "The zones don't rest. Neither do you.",
    'Afternoon window. Make it count.',
  ],
  evening: [
    'Night ops. The best runners run in the dark.',
    "Day's not done. One more mission.",
    'Close the day strong. The world needs it.',
  ],
};

export const STREAK_MESSAGES = {
  0: [
    'First mission. The world starts here.',
    'Every legend began at zero.',
    "Today's run starts the chain.",
  ],
  1: ["Streak started. Don't break it.", 'Day 1. The journey begins.'],
  3: [
    '3 days strong. The zone is waking up.',
    'Three in a row. Momentum building.',
  ],
  7: [
    'One week. The grid is almost fully restored.',
    'Seven days. This Runner is consistent.',
  ],
  14: [
    "Two weeks. You're keeping the world alive.",
    'Fourteen days straight. Elite Runner status.',
  ],
  30: ['30-day streak. The world is healing because of you.'],
};

// ─── Free / Fun Run (no XP, no targets) ──────────────────────────────────────

export const FUN_RUN_ID = 'fun-run';

export const FUN_RUN_MISSION: Mission = {
  id: FUN_RUN_ID,
  type: 'easy',
  title: 'FREE ROAM',
  subtitle: 'No objectives. Just move.',
  description:
    'No targets, no XP, no briefing — just you and the road. Run or ride because you want to. The board’s off; this one’s yours.',
  targetDistanceKm: 0,
  targetDurationMin: 0,
  targetCyclingDistanceKm: 0,
  targetCyclingDurationMin: 0,
  xpReward: 0,
  day: 'Mon',
  scheduledDate: '',
  status: 'active',
};

export const REST_DAY_MESSAGES = [
  'Rest day. Runners rebuild too.',
  'No mission today. Your body is preparing.',
  'Stand down. Come back stronger.',
  'Recovery mode. The zones are quiet tonight.',
];

export const WEEKLY_COMPLETE_MESSAGES = [
  'All missions complete in this set. The world is stronger.',
  'Perfect week. Every zone restored.',
  'Full mission week. Legendary Runner.',
];
