import type { Mission, MissionType, MissionAudioCueSet } from '../types';

// ─── Mission card copy (weekly queue) ──────────────────────────────────────────

export interface MissionCopyRow {
  title: string;
  subtitle: string;
  description: string;
}

/** Flavor text for queue missions; paired rows cycle by mission index in the week. */
export const MISSION_COPY_POOL: readonly MissionCopyRow[] = [
  {
    title: 'Med Supply Delivery',
    subtitle: 'Insulin crate to the east aid station.',
    description:
      'Deliver the insulin crate to the east aid station before the refrigeration window fails. Run easy: even pace, full sentences, until the full distance or time is complete.',
  },
  {
    title: 'Supplement Drop',
    subtitle: 'Protein packs to the childcare bunker.',
    description:
      'Carry protein packs to the childcare bunker before the noon ration count. Hold easy effort throughout; complete the full distance or time without surging.',
  },
  {
    title: 'Recruiter Post',
    subtitle: 'Roster to the intake checkpoint.',
    description:
      'Deliver the survivor roster to the intake checkpoint before the gate closes. Move at easy pace; finish the assigned distance or duration without pushing.',
  },
  {
    title: 'Water Distribution',
    subtitle: 'Purified canisters to Block C.',
    description:
      'Move purified water canisters to Block C before the reserve tanks run dry. Run easy and steady; meet the full target distance or time.',
  },
  {
    title: 'Dispatch Window',
    subtitle: 'Fire orders to forward command before cutoff.',
    description:
      'Relay fire-response orders to forward command before the comm window closes. Hold one hard, steady effort—not a sprint—until the duration ends.',
  },
  {
    title: 'Specimen Run',
    subtitle: 'Sealed cooler to the pathology lab.',
    description:
      'Deliver the sealed specimen cooler to the pathology lab before the sample degrades. Maintain threshold effort: strong and controlled for the full run.',
  },
  {
    title: 'Checkpoint Clear',
    subtitle: 'Cross Gate 6 before the barrier locks.',
    description:
      'Clear Gate 6 before the barrier locks for the next security cycle. Stay at sustained hard pace for the full duration.',
  },
  {
    title: 'Signals Handoff',
    subtitle: 'Encrypted drives to the mobile relay truck.',
    description:
      'Transport encrypted drives to the mobile relay truck before the uplink window closes. Hold one sustained hard effort without backing off.',
  },
  {
    title: 'Blood Sample Relay',
    subtitle: 'Clinic vials to the central lab.',
    description:
      'Pick up blood vials at the clinic and bring them to the central lab before the testing slot expires. Run long at easy endurance pace; bank distance and do not race early.',
  },
  {
    title: 'Shelter Forms',
    subtitle: 'Three shelter signatures; return to HQ.',
    description:
      'Collect signed intake forms from three shelters and return them to headquarters before curfew. Keep an easy aerobic pace for the full distance or duration.',
  },
  {
    title: 'Field Rations',
    subtitle: 'Meal packs to the outer camp.',
    description:
      'Move field rations to the outer camp before the evening meal line forms. Pace for distance: comfortable and patient until the full target is done.',
  },
  {
    title: 'Vaccine Cold Chain',
    subtitle: 'Cold packs to the mobile clinic.',
    description:
      'Deliver vaccine cold packs to the mobile clinic before the internal temperature rises. Run long and easy; no surges.',
  },
  {
    title: 'Fence Survey',
    subtitle: 'Mark breach points along the perimeter.',
    description:
      'Jog the perimeter fence and mark every breach point before the repair crew heads out. Keep effort low: light jog or shuffle; complete the full distance or time.',
  },
  {
    title: 'All-Clear Sweep',
    subtitle: 'Street check after the sirens stop.',
    description:
      'Move through the cleared streets after the sirens stop and confirm no civilians remain exposed. Effort stays easy; do not push heart rate.',
  },
  {
    title: 'Medic Escort',
    subtitle: 'Guide the medic through the safe corridor.',
    description:
      'Escort the medic through the safe corridor while they check the injured. You set an easy pace; cover the target distance or duration without intensity.',
  },
  {
    title: 'Witness Transfer',
    subtitle: 'Protected handoff to tribunal security.',
    description:
      'Escort the witness to tribunal security before the testimony window closes. Move at recovery effort for the full segment.',
  },
  {
    title: 'Multi-Stop Drop',
    subtitle: 'Four supply posts; hard then recover.',
    description:
      'Hit four supply posts in sequence before the route expires: hard work segments, full recovery between. Do not blend easy and hard segments.',
  },
  {
    title: 'Alarm Response',
    subtitle: 'Sprint on each breach ping; reset between.',
    description:
      'Respond to every breach alarm with a fast segment, then jog easy until the next alert. Full effort on work; real rest on recovery.',
  },
  {
    title: 'Courier Handoffs',
    subtitle: 'Rapid transfers along the defense cordon.',
    description:
      'Complete rapid courier handoffs along the defense cordon before the line shifts position. Hard intervals, then easy movement until the next station. No half-effort work reps.',
  },
  {
    title: 'Equipment Draw',
    subtitle: 'Ammo case to the range officer.',
    description:
      'Report to the armory, collect the ammo case under your name, and deliver it to the range officer before drills begin. Use hard work segments for each rush leg; easy segments between.',
  },
  {
    title: 'Power Relay',
    subtitle: 'Battery unit to the grid node.',
    description:
      'Carry the backup power unit to the nearest grid node to restore signal coverage. Hold a steady tempo effort—controlled, strong, and uninterrupted until the target is complete.',
  },
  {
    title: 'Antidote Run',
    subtitle: 'Injectable dose to Sector 3 patient.',
    description:
      'Deliver the antidote dose to the infected patient in Sector 3 before systemic failure. Maintain sustained hard effort; do not slow until the delivery point is reached.',
  },
  {
    title: 'Oxygen Delivery',
    subtitle: 'Tank to collapsed subway survivor.',
    description:
      'Deliver the oxygen tank to the trapped survivor in the collapsed subway before depletion. Maintain continuous hard effort; do not stop until delivery is complete.',
  },
  {
    title: 'Firewall Reset',
    subtitle: 'Manual reboot at Sector 5 terminal.',
    description:
      'Reach the offline terminal and execute a manual firewall reset before breach occurs. Sustain tempo effort from start to finish.',
  },
  {
    title: 'Evacuation Signal',
    subtitle: 'Trigger beacon at hilltop tower.',
    description:
      'Activate the evacuation beacon at the hilltop tower before the next wave arrives. Hold steady pace; no interruptions.',
  },
  {
    title: 'Fuel Transfer',
    subtitle: 'Diesel canister to generator site.',
    description:
      'Transport the diesel canister to the generator before full shutdown. Maintain controlled tempo effort without slowing.',
  },
  {
    title: 'Antibiotic Drop',
    subtitle: 'Dose to field medic in Zone B.',
    description:
      'Deliver antibiotics to the field medic before infection spreads. Keep sustained effort; reach the target without delay.',
  },
  {
    title: 'Perimeter Breach',
    subtitle: 'Seal gate at Sector 2 entrance.',
    description:
      'Reach the breached gate and seal it before hostile entry. Move at hard effort until the objective is secured.',
  },
  {
    title: 'Thermal Core Restart',
    subtitle: 'Reignite reactor in power block.',
    description:
      'Reach the reactor and restart the thermal core before temperature drops below threshold. Maintain steady tempo effort.',
  },
  {
    title: 'Drone Recovery',
    subtitle: 'Retrieve unit from crash site.',
    description:
      'Recover the crashed drone before data corruption. Maintain continuous pace and complete retrieval without stopping.',
  },
  {
    title: 'Quarantine Delivery',
    subtitle: 'Supplies to isolated unit.',
    description:
      'Deliver quarantine supplies before isolation breach. Maintain hard steady effort until handoff.',
  },
  {
    title: 'Signal Boost',
    subtitle: 'Amplifier to comms relay.',
    description:
      'Install the signal amplifier at the relay node before blackout. Sustain tempo effort throughout.',
  },
  {
    title: 'Contamination Sample',
    subtitle: 'Specimen to mobile lab.',
    description:
      'Transport contamination samples before decay window expires. Hold controlled hard effort.',
  },
  {
    title: 'Battery Swap',
    subtitle: 'Replace unit at defense turret.',
    description:
      'Replace depleted battery at the turret before defense drops. Maintain continuous tempo effort.',
  },
  {
    title: 'Water Purifier Fix',
    subtitle: 'Repair kit to filtration plant.',
    description:
      'Deliver repair kit to restore water purification before supply runs out. Move at steady pace until completion.',
  },
  {
    title: 'Emergency Broadcast',
    subtitle: 'Trigger system at central hub.',
    description:
      'Reach central hub and trigger broadcast before signal loss. Maintain sustained effort.',
  },
  {
    title: 'Hazmat Transfer',
    subtitle: 'Containment unit to lab.',
    description:
      'Move hazardous material before containment failure. Maintain strict tempo effort; no stops.',
  },
  {
    title: 'Shield Generator',
    subtitle: 'Core to defensive grid.',
    description:
      'Deliver the generator core before shield collapse. Maintain strong steady effort.',
  },
  {
    title: 'Bridge Access',
    subtitle: 'Override lock before collapse.',
    description:
      'Reach the control panel and override the bridge lock before structural failure. Move at sustained effort.',
  },
  {
    title: 'Radiation Dose',
    subtitle: 'Iodine tablets to exposed team.',
    description:
      'Deliver iodine tablets before radiation exposure escalates. Maintain continuous hard effort.',
  },
  {
    title: 'Power Grid Sync',
    subtitle: 'Manual sync at node 4.',
    description:
      'Synchronize grid node before cascading failure. Hold tempo effort throughout.',
  },
  {
    title: 'Supply Convoy Lead',
    subtitle: 'Clear path to extraction.',
    description:
      'Lead convoy route and clear path before arrival window closes. Maintain steady effort.',
  },
  {
    title: 'Data Core Extraction',
    subtitle: 'Secure core from bunker.',
    description:
      'Extract data core before auto-wipe. Maintain continuous pace until secured.',
  },
  {
    title: 'Ventilation Restart',
    subtitle: 'Activate airflow system.',
    description:
      'Reach system controls and restart ventilation before suffocation risk. Maintain sustained effort.',
  },
  {
    title: 'Minefield Mapping',
    subtitle: 'Mark safe corridor.',
    description:
      'Map safe path before unit movement. Maintain controlled steady pace.',
  },
  {
    title: 'Rescue Beacon',
    subtitle: 'Start beacon for extraction.',
    description:
      'Start rescue beacon before extraction window closes. Hold steady effort.',
  },
  {
    title: 'Cold Storage Run',
    subtitle: 'Preserve samples before thaw.',
    description:
      'Transport samples before temperature rise. Maintain tempo effort.',
  },
  {
    title: 'Defense Override',
    subtitle: 'Manual control at turret station.',
    description:
      'Override defense system before shutdown. Maintain continuous effort.',
  },
  {
    title: 'Med Evac Prep',
    subtitle: 'Prepare zone for extraction.',
    description:
      'Reach extraction zone and prepare site before arrival. Maintain steady pace.',
  },
  {
    title: 'Backup Server',
    subtitle: 'Restore system at node.',
    description:
      'Restore backup server before data loss. Maintain tempo effort.',
  },
  {
    title: 'Escape Route',
    subtitle: 'Mark safe path out.',
    description:
      'Mark escape route before containment breach. Maintain continuous pace.',
  },
  {
    title: 'Hydrogen Cell',
    subtitle: 'Deliver fuel to drone.',
    description:
      'Deliver fuel cell before drone shutdown. Maintain sustained effort.',
  },
  {
    title: 'Security Lockdown',
    subtitle: 'Engage locks before breach.',
    description:
      'Reach control system and engage lockdown. Maintain hard effort.',
  },
  {
    title: 'Emergency Rations',
    subtitle: 'Food supply to survivors.',
    description: 'Deliver rations before depletion. Maintain steady pace.',
  },
  {
    title: 'Heat Core Transfer',
    subtitle: 'Move unit before freeze.',
    description:
      'Transfer heat core before temperature drop. Maintain tempo effort.',
  },
  {
    title: 'Airlock Seal',
    subtitle: 'Close chamber before breach.',
    description:
      'Seal airlock before pressure loss. Maintain continuous effort.',
  },
  {
    title: 'Sensor Calibration',
    subtitle: 'Reset tracking system.',
    description:
      'Calibrate sensors before navigation failure. Maintain steady pace.',
  },
  {
    title: 'Emergency Power',
    subtitle: 'Restore backup grid.',
    description:
      'Restore power before blackout spreads. Maintain sustained effort.',
  },
  {
    title: 'Final Transmission',
    subtitle: 'Send last data packet.',
    description:
      'Reach transmitter and send final data before shutdown. Maintain hard steady effort.',
  },
  {
    title: 'Antidote Run',
    subtitle: 'Injectable dose to Sector 3 patient.',
    description:
      'Deliver the antidote dose to the infected patient in Sector 3 before systemic failure. Maintain sustained hard effort; do not slow until the delivery point is reached.',
  },
];

export function missionCopyForQueueIndex(index: number): MissionCopyRow {
  const n = MISSION_COPY_POOL.length;
  if (n === 0) return { title: '', subtitle: '', description: '' };
  return MISSION_COPY_POOL[index % n]!;
}

// ─── In-Run Audio Cues ───────────────────────────────────────────────────────
// Fallback when mission.audioCues is unset. Short lines — one sentence each.

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

/**
 * In-run TTS when `mission.audioCues` is unset — JSON-shaped manifest per mission type.
 * Edit like config: one object keyed by type, each phase is a string array.
 */
export const MISSION_AUDIO_CUES_JSON = {
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
} satisfies Record<MissionType, MissionAudioCueSet>;

/** Lookup alias — use `MISSION_AUDIO_CUES_JSON` for the editable blob. */
export const MISSION_AUDIO_CUES: Record<MissionType, MissionAudioCueSet> =
  MISSION_AUDIO_CUES_JSON;

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
    'Morning. The grid wakes up with you.',
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
