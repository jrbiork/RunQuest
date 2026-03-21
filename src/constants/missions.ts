import type { Mission, MissionType } from '../types';

// ─── Mission Microcopy Templates ─────────────────────────────────────────────

export interface MissionTemplate {
  type: MissionType;
  titles: string[];
  subtitles: string[];
  descriptions: string[];
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
      'The sector\'s power grid is flickering. Your movement generates the signal it needs to stabilize. Focus on form, not speed. The zone will feel you.',
    ],
    motivationalFraming: [
      'Every kilometer restores another block.',
      'The grid goes dark without you. Keep moving.',
      'Show up. That\'s the mission.',
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
    motivationalFraming: [
      'The signal gets stronger as you push.',
      'Zones are counting on this connection.',
      'Embrace the push — it\'s progress.',
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
      'The cornerstone of your week. Run slow, run far. Every kilometer crossed puts resources where they\'re needed most.',
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
      'Light movement. Survey the damage. Survivors need to know what\'s out there.',
      'Super easy. Almost embarrassingly slow. That\'s the point.',
      'Protecting your streak and your body at the same time.',
    ],
    descriptions: [
      'Light movement. Survey the damage. Survivors need to know what\'s out there. Run as slow as you need to. The goal is movement and observation, not performance.',
      'A scout run to keep your streak alive and flush out tired legs. Easy pace. Keep your eyes open — every detail matters in the field.',
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
// Five cues per mission: [start, 25%, 50%, 75%, 100%]

export interface MissionAudioCues {
  start: string;
  quarter: string;
  half: string;
  threeQuarter: string;
  complete: string;
}

export const MISSION_AUDIO_CUES: Record<MissionType, MissionAudioCues> = {
  easy: {
    start:        'Grid Patrol initiated. Steady pace, Runner. Let the zone feel your presence.',
    quarter:      'Signal is faint but rising. Keep your rhythm. Every step charges the grid.',
    half:         'Halfway. Power levels climbing. The sector is starting to respond.',
    threeQuarter: 'Almost there. Three quarters done. The grid lights are flickering on ahead.',
    complete:     'Grid restored. Sector online. Mission complete, Runner. Well done.',
  },
  tempo: {
    start:        'Signal Rush protocol active. Push hard and hold it, Runner. The tower is counting on you.',
    quarter:      'Tower signal at twenty-five percent. Keep the pace high. No backing down now.',
    half:         'Halfway through the push. Signal is building. Hold this frequency — do not drop it.',
    threeQuarter: 'Final surge incoming. Three quarters done. Dig deep. The tower is almost back online.',
    complete:     'Tower online. Full signal restored. Threshold run complete. The network is expanding.',
  },
  long: {
    start:        'Cross-zone delivery underway. Settle into your pace, Runner. This is a long road — respect it.',
    quarter:      'First zone crossed. Supplies secure. Stay relaxed. The survivors are waiting.',
    half:         'Halfway across. You are carrying more than supplies — you are carrying hope. Keep going.',
    threeQuarter: 'Almost at the destination. Three zones down. One more push and the delivery is complete.',
    complete:     'Delivery complete. Zone seven has what it needs. Outstanding endurance, Runner.',
  },
  recovery: {
    start:        'Scout patrol initiated. Easy movement, Runner. Eyes open, pace light. Survey everything.',
    quarter:      'Perimeter quarter mapped. Good intel so far. Stay loose — recovery is the mission today.',
    half:         'Halfway through the recon. Your body is thanking you. Keep it easy. Every step counts.',
    threeQuarter: 'Almost done with the sweep. Three quarters of the perimeter secured. Nearly there.',
    complete:     'Recon complete. Perimeter mapped. Intel filed. Smart work, Runner. Rest earned.',
  },
  interval: {
    start:        'Surge Protocol activated. Get ready to push hard, Runner. Bursts of speed, then recover — repeat.',
    quarter:      'First surge done. Good output. Recover now — you will need that energy for the next push.',
    half:         'Halfway through the anomaly response. The surges are working. Stay sharp and keep the pattern.',
    threeQuarter: 'Final surge incoming. Three quarters down. One last hard push and the anomaly is contained.',
    complete:     'Surge Protocol complete. Anomaly suppressed. Speed capacity upgraded. Outstanding effort, Runner.',
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
    'The zones don\'t rest. Neither do you.',
    'Afternoon window. Make it count.',
  ],
  evening: [
    'Night ops. The best runners run in the dark.',
    'Day\'s not done. One more mission.',
    'Close the day strong. The world needs it.',
  ],
};

export const STREAK_MESSAGES = {
  0: [
    'First mission. The world starts here.',
    'Every legend began at zero.',
    'Today\'s run starts the chain.',
  ],
  1: ['Streak started. Don\'t break it.', 'Day 1. The journey begins.'],
  3: ['3 days strong. The zone is waking up.', 'Three in a row. Momentum building.'],
  7: ['One week. The grid is almost fully restored.', 'Seven days. This Runner is consistent.'],
  14: ['Two weeks. You\'re keeping the world alive.', 'Fourteen days straight. Elite Runner status.'],
  30: ['30-day streak. The world is healing because of you.'],
};

// ─── Free / Fun Run (no XP, no targets) ──────────────────────────────────────

export const FUN_RUN_ID = 'fun-run';

export const FUN_RUN_MISSION: Mission = {
  id: FUN_RUN_ID,
  type: 'easy',
  title: 'FREE ROAM',
  subtitle: 'No objectives. Just move.',
  description: 'All missions complete. Hit the road for fun — no XP, no targets, just running. The world is already restored. This one is for you.',
  targetDistanceKm: 0,
  targetDurationMin: 0,
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
