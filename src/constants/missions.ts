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
      'Med Supply Delivery',
      'Supplement Drop',
      'Recruiter Post',
      'Water Distribution',
    ],
    subtitles: [
      'Crate to the community aid station.',
      'Childcare center on the manifest.',
      'Next checkpoint; confirm arrival slot.',
      'Depot to the community tent.',
    ],
    descriptions: [
      'Move sealed supply to the address on the dispatch card. Run easy: even pace and full sentences until the target distance or time is done.',
      'Foot courier for non-urgent parcels. Hold one easy gear for the full run; no surges.',
    ],
    variants: [
      {
        title: 'Med Supply Delivery',
        subtitle: 'Crate to the community aid station.',
        description:
          'Deliver medications to the community aid station on your route. Run easy: even pace, full sentences, until you hit the target distance or time.',
      },
      {
        title: 'Supplement Drop',
        subtitle: 'Childcare center on the manifest.',
        description:
          'Take food supplements to the childcare center listed on your manifest. Hold easy effort throughout; complete the distance or time without surging.',
      },
      {
        title: 'Recruiter Post',
        subtitle: 'Next checkpoint; confirm arrival slot.',
        description:
          'Meet the recruiter at the next post on the route sheet. Move at easy pace; finish the assigned distance or duration.',
      },
      {
        title: 'Water Distribution',
        subtitle: 'Depot to the community tent.',
        description:
          'Move water containers from the depot to the distribution tent. Run easy and steady; meet the target distance or time.',
      },
    ],
    motivationalFraming: [
      'Manifest distance logged.',
      'Courier window covered.',
      'Target distance or time filed.',
    ],
    completionMessages: [
      'Delivery logged. Crate signed at aid station.',
      'Drop complete. Manifest closed.',
      'Easy run complete. Distance or time on record.',
    ],
  },
  tempo: {
    type: 'tempo',
    titles: [
      'Dispatch Window',
      'Specimen Run',
      'Checkpoint Clear',
      'Signals Handoff',
    ],
    subtitles: [
      'Orders to forward command before cutoff.',
      'Cooler to the pathology lab.',
      'Route before the barrier reconfigures.',
      'Drives to the mobile signals unit.',
    ],
    descriptions: [
      'Time-critical paperwork to a fixed recipient. Hold one hard, steady effort for the full duration.',
      'Threshold pace: uncomfortable, controlled, no sprint finish early.',
    ],
    variants: [
      {
        title: 'Dispatch Window',
        subtitle: 'Orders to forward command before cutoff.',
        description:
          'Relay written orders to forward command before the comm window closes. Hold one hard, steady effort—not a sprint—until the duration ends.',
      },
      {
        title: 'Specimen Run',
        subtitle: 'Cooler to the pathology lab.',
        description:
          'Deliver the sealed specimen cooler to the pathology lab on schedule. Maintain threshold effort: strong and controlled for the full run.',
      },
      {
        title: 'Checkpoint Clear',
        subtitle: 'Route before the barrier reconfigures.',
        description:
          'Clear the access checkpoint before it reconfigures for the next shift. Stay at sustained hard pace for the full duration.',
      },
      {
        title: 'Signals Handoff',
        subtitle: 'Drives to the mobile signals unit.',
        description:
          'Transport encrypted drives from Station B to the mobile signals unit. Hold one sustained hard effort without backing off.',
      },
    ],
    motivationalFraming: [
      'Threshold segment scheduled.',
      'Hard steady pace assigned.',
      'Duration target is fixed.',
    ],
    completionMessages: [
      'Dispatch delivered. Window closed on time.',
      'Cooler receipt confirmed at lab.',
      'Tempo run complete. Duration on file.',
    ],
  },
  long: {
    type: 'long',
    titles: [
      'Blood Sample Relay',
      'Shelter Forms',
      'Field Rations',
      'Vaccine Cold Chain',
    ],
    subtitles: [
      'Clinic to lab; courier window.',
      'Three stops; return to HQ by cutoff.',
      'End of the marked supply route.',
      'Mobile unit at the fairgrounds.',
    ],
    descriptions: [
      'Long foot leg with weight allowance for pack. Easy endurance pace; full distance or time.',
      'Distance priority over speed. No mid-run surges.',
    ],
    variants: [
      {
        title: 'Blood Sample Relay',
        subtitle: 'Clinic to lab; courier window.',
        description:
          'Pick up blood samples at the clinic and bring them to the lab before the courier window closes. Run long at easy endurance pace; bank distance, do not race early.',
      },
      {
        title: 'Shelter Forms',
        subtitle: 'Three stops; return to HQ by cutoff.',
        description:
          'Collect signed intake forms from three shelters on the route sheet and return them to headquarters by the end time. Keep an easy aerobic pace for the full distance or duration.',
      },
      {
        title: 'Field Rations',
        subtitle: 'End of the marked supply route.',
        description:
          'Move field rations to the evacuation camp at the end of the marked route. Pace for distance: comfortable and patient until the full target is done.',
      },
      {
        title: 'Vaccine Cold Chain',
        subtitle: 'Mobile unit at the fairgrounds.',
        description:
          'Deliver cold-chain vaccine packs to the mobile unit at the fairgrounds; confirm temperature logs on receipt. Run long and easy; no surges.',
      },
    ],
    motivationalFraming: [
      'Route mileage assigned.',
      'Endurance segment on the schedule.',
      'Full distance or duration required.',
    ],
    completionMessages: [
      'Relay complete. Lab receipt on file.',
      'Forms returned to HQ. Route closed.',
      'Long run complete. Distance or time logged.',
    ],
  },
  recovery: {
    type: 'recovery',
    titles: [
      'Fence Survey',
      'All-Clear Sweep',
      'Medic Escort',
      'Witness Transfer',
    ],
    subtitles: [
      'Log breach markers; low effort.',
      'Observation pace after the lift.',
      'Slow sweep; you set the pace.',
      'Transit station to courthouse handoff.',
    ],
    descriptions: [
      'Low-intensity movement only. Full target at recovery heart rate.',
      'Motion without training stress. Complete distance or time.',
    ],
    variants: [
      {
        title: 'Fence Survey',
        subtitle: 'Log breach markers; low effort.',
        description:
          'Walk the fence line and log breach markers. Keep effort low: light jog or shuffle; complete the full distance or time.',
      },
      {
        title: 'All-Clear Sweep',
        subtitle: 'Observation pace after the lift.',
        description:
          'Move through the cleared block at observation pace after the all-clear. Effort stays easy; do not push heart rate.',
      },
      {
        title: 'Medic Escort',
        subtitle: 'Slow sweep; you set the pace.',
        description:
          'Escort the medic on a slow route sweep. You set an easy pace; cover the target distance or duration without intensity.',
      },
      {
        title: 'Witness Transfer',
        subtitle: 'Transit station to courthouse handoff.',
        description:
          'Escort a witness from the transit station to the courthouse entrance and hand them off to court security. Move at recovery effort for the full segment.',
      },
    ],
    motivationalFraming: [
      'Recovery segment only.',
      'Low effort logged as ordered.',
      'Distance or time at easy output.',
    ],
    completionMessages: [
      'Survey filed. Perimeter notes attached.',
      'Sweep complete. Observation log closed.',
      'Recovery run complete. Effort band met.',
    ],
  },
  interval: {
    type: 'interval',
    titles: [
      'Multi-Stop Drop',
      'Alarm Response',
      'Courier Handoffs',
      'Equipment Draw',
    ],
    subtitles: [
      'Supply at each post; hard then recover.',
      'Fast segment per ping; then reset.',
      'Cordon posts; surge then wait.',
      'Armory bundle to range officer.',
    ],
    descriptions: [
      'Repeated hard segments with full recovery between. No mixed pacing.',
      'Work intervals at full effort; easy intervals slow enough to speak in full sentences.',
    ],
    variants: [
      {
        title: 'Multi-Stop Drop',
        subtitle: 'Supply at each post; hard then recover.',
        description:
          'Hit multiple supply drops in sequence: hard work segments, full recovery between. Do not blend easy and hard segments.',
      },
      {
        title: 'Alarm Response',
        subtitle: 'Fast segment per ping; then reset.',
        description:
          'Respond to each alarm ping with a fast segment, then jog easy until the next. Full effort on work; real rest on recovery.',
      },
      {
        title: 'Courier Handoffs',
        subtitle: 'Cordon posts; surge then wait.',
        description:
          'Rapid courier handoffs along the cordon: hard intervals, then easy movement until the next station. No half-effort work reps.',
      },
      {
        title: 'Equipment Draw',
        subtitle: 'Armory bundle to range officer.',
        description:
          'Report to the armory, draw the equipment bundle on your name, and deliver it to the training range officer. Use hard work segments for each rush leg; easy segments between.',
      },
    ],
    motivationalFraming: [
      'Interval set on the board.',
      'Work and recovery segments fixed.',
      'Repeat until the set is complete.',
    ],
    completionMessages: [
      'Drop sequence complete. All posts checked.',
      'Interval set logged. Rep count closed.',
      'Handoffs complete. Equipment receipt filed.',
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
  'Tracking on. Begin movement.',
  'Start segment now.',
  'Window open. Move.',
  'Go. Log distance from here.',
  'Begin run. Timer active.',
  'Start. Cover the assigned target.',
  'Movement start. Proceed.',
] as const;

/** First cue when map mission tracking starts (running/cycling). */
export function buildMissionStartLiveCue(): string {
  return pickCue([...MISSION_START_LIVE_CUE_TEMPLATES]);
}

export const MISSION_COMPLETE_LIVE_CUE_LINES = [
  'Target met. Segment complete.',
  'Distance or time target reached. Stop or continue as needed.',
  'Objective distance or duration logged.',
  'Assignment segment closed on target.',
  'Run target satisfied. Log saved.',
  'Segment complete. Metrics recorded.',
] as const;

/** Cue when the mission objective is reached on the map. */
export function pickMissionCompleteLiveCue(): string {
  return pickCue([...MISSION_COMPLETE_LIVE_CUE_LINES]);
}

export const MISSION_AUDIO_CUES: Record<MissionType, MissionAudioCueSet> = {
  easy: {
    start: [
      'Easy segment. Pace you can talk through.',
      'Hold steady easy effort for the full target.',
      'Conversational pace. No surges.',
    ],
    quarter: [
      'Twenty-five percent of target. Same easy effort.',
      'First quarter done. Hold pace.',
      'Quarter complete. No increase in effort.',
    ],
    half: [
      'Half of target. Still easy output.',
      'Midpoint. Breathing under control.',
      'Fifty percent. Steady continues.',
    ],
    threeQuarter: [
      'Seventy-five percent. Finish at same easy pace.',
      'Three quarters. No kick.',
      'Last quarter. Hold the line.',
    ],
    complete: [
      'Easy segment complete. Target covered.',
      'Distance or time target met at easy pace.',
      'Segment logged. Easy effort closed.',
    ],
  },

  tempo: {
    start: [
      'Threshold segment. Hard, steady, controlled.',
      'Sustained hard effort for full duration.',
      'One gear. No backing off until time ends.',
    ],
    quarter: [
      'Twenty-five percent of duration. Stay at threshold.',
      'Quarter in. Hard effort holds.',
      'First quarter. No drop in pace.',
    ],
    half: [
      'Half of duration. Threshold continues.',
      'Midpoint. Same hard steady output.',
      'Fifty percent. Hold.',
    ],
    threeQuarter: [
      'Seventy-five percent. No ease-up.',
      'Three quarters. Finish at threshold.',
      'Last quarter. Sustain.',
    ],
    complete: [
      'Threshold segment complete. Duration met.',
      'Hard steady run closed on schedule.',
      'Tempo segment logged.',
    ],
  },

  long: {
    start: [
      'Long segment. Start easy; cover full distance or time.',
      'Endurance pace. Conserve early.',
      'Easy aerobic output for the full target.',
    ],
    quarter: [
      'Twenty-five percent. Pace still easy.',
      'First quarter. Legs relaxed.',
      'Quarter done. No rush.',
    ],
    half: [
      'Half of target. Patient pacing.',
      'Midpoint. Aerobic only.',
      'Fifty percent. Hold endurance gear.',
    ],
    threeQuarter: [
      'Seventy-five percent. Bring it in steady.',
      'Three quarters. No surge.',
      'Last stretch. Same easy endurance.',
    ],
    complete: [
      'Long segment complete. Full target covered.',
      'Endurance distance or time logged.',
      'Route segment closed.',
    ],
  },

  recovery: {
    start: [
      'Recovery segment. Low effort only.',
      'Easy motion. Heart rate down.',
      'Shuffle or light jog. Full target at low output.',
    ],
    quarter: [
      'Twenty-five percent. Still easy.',
      'Quarter done. No intensity increase.',
      'First quarter. Recovery pace only.',
    ],
    half: [
      'Half of target. Low effort holds.',
      'Midpoint. No push.',
      'Fifty percent. Easy continues.',
    ],
    threeQuarter: [
      'Seventy-five percent. Light to the end.',
      'Three quarters. No finish kick.',
      'Last quarter. Recovery only.',
    ],
    complete: [
      'Recovery segment complete.',
      'Low-effort target met.',
      'Easy segment logged.',
    ],
  },

  interval: {
    start: [
      'Interval set. Hard segments, easy recovery between.',
      'Work and rest segments alternate. Do not mix.',
      'First work interval begins now.',
    ],
    quarter: [
      'Twenty-five percent of set. Recover fully between work.',
      'Quarter through. Quality on work reps.',
      'First block done. Pattern holds.',
    ],
    half: [
      'Half of interval set. Easy segments stay easy.',
      'Mid set. Full effort on work only.',
      'Fifty percent. No sandbagging work reps.',
    ],
    threeQuarter: [
      'Seventy-five percent. Last work reps.',
      'Three quarters. Finish each interval clean.',
      'Final block. Full effort on go segments.',
    ],
    complete: [
      'Interval set complete. All reps logged.',
      'Work and recovery pattern closed.',
      'Interval segment finished.',
    ],
  },
};

// ─── Post-Run World Impact Messages ──────────────────────────────────────────

export const MISSION_IMPACT_MESSAGES: Record<MissionType, string[]> = {
  easy: [
    'Courier segment closed. Delivery log updated.',
    'Easy run filed. Distance or time on record.',
    'Manifest stop completed.',
  ],
  tempo: [
    'Time-critical segment closed. Dispatch on file.',
    'Threshold run logged. Duration satisfied.',
    'Hard steady segment complete.',
  ],
  long: [
    'Long route segment closed. Relay paperwork filed.',
    'Endurance target met. Distance or time logged.',
    'Supply leg complete.',
  ],
  recovery: [
    'Low-effort segment complete. Observation notes filed.',
    'Recovery run logged.',
    'Easy sweep closed.',
  ],
  interval: [
    'Interval set complete. All work reps logged.',
    'Handoff pattern closed.',
    'Speed work segment filed.',
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
  subtitle: 'No distance or time target.',
  description:
    'No mission target, no XP. Run or ride without an assigned distance or duration. Tracking optional.',
  targetDistanceKm: 0,
  targetDurationMin: 0,
  targetCyclingDistanceKm: 0,
  targetCyclingDurationMin: 0,
  xpReward: 0,
  day: 'Mon',
  scheduledDate: '',
  status: 'active',
  setIndex: 0,
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
