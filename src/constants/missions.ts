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
      'A downed power line needs reconnecting. Keep moving.',
      'Every step you take sends energy back to the zone.',
      'Slow and steady. The grid charges as you run.',
      'Consistent movement is how the world comes back online.',
    ],
    descriptions: [
      'A downed power line needs reconnecting. Keep moving — every step charges the grid. Run at an easy, sustainable pace. You should be able to speak full sentences.',
      "The sector's power grid is flickering. Your movement generates the signal it needs to stabilize. Focus on form, not speed. The zone will feel you.",
    ],
    variants: [
      {
        title: 'Restore Sector 4',
        subtitle: 'A downed power line needs reconnecting. Keep moving.',
        description:
          'A downed power line needs reconnecting. Keep moving — every step charges the grid. Run at an easy, sustainable pace. You should be able to speak full sentences.',
      },
      {
        title: 'Grid Patrol Run',
        subtitle: 'Every step you take sends energy back to the zone.',
        description:
          'The patrol route maps dead relays. Your steady pace feeds the grid signal survivors are waiting on. Easy effort only — talk-test pace.',
      },
      {
        title: 'Power Line Check',
        subtitle: 'Slow and steady. The grid charges as you run.',
        description:
          'Inspect the trunk line on foot: movement keeps diagnostics live while you scan for breaks. Stay relaxed; the mission is consistency.',
      },
      {
        title: 'Charge the Grid',
        subtitle: 'Consistent movement is how the world comes back online.',
        description:
          "The sector's power grid is flickering. Your movement generates the signal it needs to stabilize. Focus on form, not speed. The zone will feel you.",
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
      'The comm tower is half-dead. A sustained push will bring it back online.',
      'Signal strength drops every second. Push hard and hold.',
      'Unlock the next frequency band.',
    ],
    descriptions: [
      'The comm tower is half-dead. A sustained pace push will bring it back online. Run at a comfortably hard effort — you should feel challenged but controlled.',
      'Hold a sustained hard effort for the target duration. The signal gets stronger as you push. This is where zones reconnect.',
    ],
    variants: [
      {
        title: 'Boost the Tower',
        subtitle:
          'The comm tower is half-dead. A sustained push will bring it back online.',
        description:
          'Relay crews need a sustained carrier wave. Hold threshold effort — hard but controlled — until the tower locks frequency for the outlying camps.',
      },
      {
        title: 'Signal Rush Protocol',
        subtitle: 'Signal strength drops every second. Push hard and hold.',
        description:
          'Enemy jamming is climbing. Your sustained push is the only handshake that clears the band. Stay at threshold; easing off drops the link.',
      },
      {
        title: 'Reconnect the Network',
        subtitle: 'Unlock the next frequency band.',
        description:
          'Three settlements go dark if this run fails. Run at comfortably hard effort and hold — the signal strengthens only while you stay in the pain.',
      },
      {
        title: 'Hold the Frequency',
        subtitle: 'Signal strength drops every second. Push hard and hold.',
        description:
          'Hold a sustained hard effort for the target duration. The signal gets stronger as you push. This is where zones reconnect.',
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
      'Medical supplies. Three zones over. The longer you go, the more people you reach.',
      'Go slow, go far. Survivors are waiting.',
      'Your biggest run of the week. Take your time.',
    ],
    descriptions: [
      'Medical supplies need to reach Zone 7. Three zones over. The longer you go, the more people you reach. Keep the pace easy — time on your feet is what matters here.',
      "The cornerstone of your week. Run slow, run far. Every kilometer crossed puts resources where they're needed most.",
    ],
    variants: [
      {
        title: 'Cross-Zone Delivery',
        subtitle:
          'Medical supplies. Three zones over. The longer you go, the more people you reach.',
        description:
          'Medical supplies need to reach Zone 7. Three zones over. The longer you go, the more people you reach. Keep the pace easy — time on your feet is what matters here.',
      },
      {
        title: 'Medical Supply Run',
        subtitle: 'Go slow, go far. Survivors are waiting.',
        description:
          'Carry the cold-chain pack to the clinic relay. Easy pace; the clock is your legs, not your lungs. If you stop, the dose may not arrive.',
      },
      {
        title: 'The Long Haul',
        subtitle: 'Your biggest run of the week. Take your time.',
        description:
          "The cornerstone of your week. Run slow, run far. Every kilometer crossed puts resources where they're needed most.",
      },
      {
        title: 'Outlander Route',
        subtitle: 'Go slow, go far. Survivors are waiting.',
        description:
          'Courier route through unmapped ruins — you are the moving supply line. Conserve energy early; the last sector is always the longest.',
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
      "Light movement. Survey the damage. Survivors need to know what's out there.",
      "Super easy. Almost embarrassingly slow. That's the point.",
      'Protecting your streak and your body at the same time.',
    ],
    descriptions: [
      "Light movement. Survey the damage. Survivors need to know what's out there. Run as slow as you need to. The goal is movement and observation, not performance.",
      'A scout run to keep your streak alive and flush out tired legs. Easy pace. Keep your eyes open — every detail matters in the field.',
    ],
    variants: [
      {
        title: 'Recon the Perimeter',
        subtitle:
          "Light movement. Survey the damage. Survivors need to know what's out there.",
        description:
          "Light movement. Survey the damage. Survivors need to know what's out there. Run as slow as you need to. The goal is movement and observation, not performance.",
      },
      {
        title: 'Survey the Damage',
        subtitle: "Super easy. Almost embarrassingly slow. That's the point.",
        description:
          'Map new cracks and choke points for the council — intel saves lives. Super easy pace; observation beats speed.',
      },
      {
        title: 'Scout Patrol',
        subtitle: 'Protecting your streak and your body at the same time.',
        description:
          'A scout run to keep your streak alive and flush out tired legs. Easy pace. Keep your eyes open — every detail matters in the field.',
      },
      {
        title: 'Zone Assessment',
        subtitle:
          "Light movement. Survey the damage. Survivors need to know what's out there.",
        description:
          'Quiet sweep to log movement patterns near the wire. Move gently; you are gathering data, not racing patrols.',
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
      'Bursts of speed. The anomaly is spreading. Push hard, recover, push again.',
      'Short hard efforts. Maximum XP. Maximum impact.',
      'This is where speed is born.',
    ],
    descriptions: [
      'The anomaly is spreading. Bursts of speed are required — push hard, recover, push again. High-intensity intervals: run hard for a set period, recover, repeat.',
      'Alternate between hard efforts and easy recovery. This type of training is the fastest way to expand your operational range — and earn maximum XP.',
    ],
    variants: [
      {
        title: 'Surge Protocol',
        subtitle:
          'Bursts of speed. The anomaly is spreading. Push hard, recover, push again.',
        description:
          'The anomaly is spreading. Bursts of speed are required — push hard, recover, push again. High-intensity intervals: run hard for a set period, recover, repeat.',
      },
      {
        title: 'Outrun the Storm',
        subtitle: 'Short hard efforts. Maximum XP. Maximum impact.',
        description:
          'Toxic front moving in — sprints buy evacuation windows. Alternate hard surges with full recovery; sloppy intervals cost lives.',
      },
      {
        title: 'Anomaly Response',
        subtitle: 'This is where speed is born.',
        description:
          'Alternate between hard efforts and easy recovery. This type of training is the fastest way to expand your operational range — and earn maximum XP.',
      },
      {
        title: 'Emergency Sprint',
        subtitle: 'Short hard efforts. Maximum XP. Maximum impact.',
        description:
          'Rapid response to a breach alarm: surge, reset, surge. Maximum effort on work intervals — the dead zone does not wait.',
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
    'All missions complete. Hit the road for fun — no XP, no targets, just running. The world is already restored. This one is for you.',
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
  'All missions complete. The world is stronger this week.',
  'Perfect week. Every zone restored.',
  'Full mission week. Legendary Runner.',
];
