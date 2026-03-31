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
// Each slot holds multiple variants — one is picked at random each run.
// Cues are written to match the specific demands of each mission type.

export interface MissionAudioCues {
  start: string[];
  quarter: string[];
  half: string[];
  threeQuarter: string[];
  complete: string[];
}

/** Pick a random line from a cue variants array. */
export function pickCue(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0] ?? '';
}

export const MISSION_AUDIO_CUES: Record<MissionType, MissionAudioCues> = {

  // ── Easy ─────────────────────────────────────────────────────────────────
  // Relaxed steady-state run. Cues reinforce comfortable effort and rhythm.
  easy: {
    start: [
      'Grid Patrol initiated. Settle in, Runner. Easy effort today — let the zone feel your presence.',
      'Patrol route active. Find a comfortable pace and hold it. Rhythm over speed.',
      'Zone patrol underway. Keep it conversational. Conserve the grid, one steady step at a time.',
    ],
    quarter: [
      'First sector cleared. Signal rising. Stay at this effort — no need to push harder.',
      'Twenty-five percent. You are in your groove. Patrol continues — hold the pace steady.',
      'Quarter done. Grid responding. Keep the effort light and sustainable.',
    ],
    half: [
      'Halfway through the patrol. Power levels climbing. Your rhythm is working — maintain it.',
      'Midpoint reached. Good consistency, Runner. Stay relaxed and keep the grid moving.',
      'Half done. The sector is responding. Comfortable effort — you have got plenty left.',
    ],
    threeQuarter: [
      'Three quarters done. Grid lights are coming on ahead. Stay easy — almost home.',
      'Final sector incoming. Keep the same effort. No need to accelerate yet.',
      'Seventy-five percent. Steady to the finish. Same pace, same breathing.',
    ],
    complete: [
      'Grid restored. Sector online. Well-executed patrol, Runner.',
      'Patrol complete. Zone fully charged. Solid base work today.',
      'Mission accomplished. Grid is live. Easy run filed — base fitness building.',
    ],
  },

  // ── Tempo ─────────────────────────────────────────────────────────────────
  // Sustained hard effort at threshold. Cues push pace and reinforce discomfort is expected.
  tempo: {
    start: [
      'Signal Rush protocol active. Push hard and hold it, Runner. Find your threshold and live there.',
      'Tempo protocol engaged. This is supposed to feel hard — that is the point. Hold the line.',
      'Threshold run initiated. Push into the discomfort and stay there. The tower is counting on you.',
    ],
    quarter: [
      'Tower signal at twenty-five percent. Hold this pace — no backing down now.',
      'First quarter done. You are at threshold — good. Do not ease off. Maintain the frequency.',
      'Quarter through. Signal rising. This is hard — stay hard. Do not let the pace slip.',
    ],
    half: [
      'Halfway through the push. This is where tempo hurts. Embrace it — this is raising your ceiling.',
      'Midpoint reached. Half the push behind you. Hold the pace — the tower needs full signal.',
      'Fifty percent. Pain is expected. Dropping pace is not an option. Stay at threshold.',
    ],
    threeQuarter: [
      'Final surge incoming. Three quarters done. Dig deeper — do not drop pace now.',
      'Seventy-five percent. Last section. Give everything you have left — leave nothing.',
      'Three quarters done. Your threshold is rising. One more push and it is locked in.',
    ],
    complete: [
      'Tower online. Full signal restored. Threshold run complete — your ceiling just got higher.',
      'Tempo protocol complete. Network expanding. Speed capacity upgraded, Runner.',
      'Threshold locked. Mission complete. That was hard — and that is exactly why it worked.',
    ],
  },

  // ── Long ──────────────────────────────────────────────────────────────────
  // Extended endurance run. Cues reinforce patience, energy conservation, and the long game.
  long: {
    start: [
      'Cross-zone delivery underway. Settle in, Runner. Go out easy — you have a long road ahead.',
      'Long route activated. Start conservative. First kilometre is always slower — that is correct.',
      'Endurance mission underway. Relax into it. This is about time on your feet, not speed.',
    ],
    quarter: [
      'First zone crossed. Supplies secure. Stay relaxed — pace should feel almost too easy right now.',
      'Twenty-five percent. Good start. Conserve energy — the back half will test you.',
      'Quarter done. Legs feeling good? Keep them that way. Do not spend what you will need later.',
    ],
    half: [
      'Halfway across. You are carrying more than supplies — you are carrying your own endurance. Keep going.',
      'Midpoint. Check in — legs, breathing, effort. Adjust and continue. Long runs reward patience.',
      'Half done. The real work starts here. Stay steady. Every kilometre now builds the engine.',
    ],
    threeQuarter: [
      'Three zones down. One more push and delivery is complete. Dig into your reserves.',
      'Seventy-five percent. You have done the hard work. Now bring it home.',
      'Final leg. Three quarters done. The distance is yours — own it to the end.',
    ],
    complete: [
      'Delivery complete. Outstanding endurance, Runner. That is real aerobic work in the bank.',
      'Long route complete. You just extended your range. Every long run makes the next one easier.',
      'Cross-zone mission filed. Distance covered. Your engine just got bigger.',
    ],
  },

  // ── Recovery ──────────────────────────────────────────────────────────────
  // Active recovery run. Cues are calm, gentle, and reinforce that easy IS the goal.
  recovery: {
    start: [
      'Recovery patrol active. Super easy today, Runner. This run is about healing, not speed.',
      'Scout sweep initiated. Your only mission — move gently. Let your body restore itself.',
      'Active recovery underway. Stay well within your limits. Light feet, loose arms, easy breathing.',
    ],
    quarter: [
      'First quarter done. Breathing easy? Good. This pace is exactly right — stay here.',
      'Perimeter clearing. Legs loosening up. Keep it gentle — recovery is the entire mission today.',
      'Twenty-five percent. Your muscles are thanking you. Light effort, keep moving.',
    ],
    half: [
      'Halfway through the sweep. Body absorbing the work. Perfect recovery pace — do not break it.',
      'Midpoint. You are doing this right. Slow and steady is winning today.',
      'Half done. Blood flowing, tension releasing. This is what smart training looks like.',
    ],
    threeQuarter: [
      'Three quarters complete. Almost done. Light legs all the way to the end.',
      'Final stretch of the sweep. Stay loose. Finish as easy as you started.',
      'Seventy-five percent. Recovery run nearly done. No heroics — stay comfortable.',
    ],
    complete: [
      'Scout patrol complete. Perimeter secured. Smart work, Runner — your body is restored.',
      'Recovery run filed. Your system will be ready for the next hard effort. Well done.',
      'Recon complete. Intel filed. That run just made your next hard session better.',
    ],
  },

  // ── Interval ──────────────────────────────────────────────────────────────
  // Speed work with alternating hard and easy efforts. Cues coach the push-recover cycle.
  interval: {
    start: [
      'Surge Protocol activated. First effort coming up — go hard, then recover. Alternate and repeat.',
      'Interval sequence initiated. Push maximum effort on the surges, then flush it out on recovery. Let us go.',
      'Speed work underway. Short bursts, full effort. First surge — hit it hard, Runner.',
    ],
    quarter: [
      'First surge sequence done. Good output. Recover now — flush the legs. Next push is coming.',
      'Twenty-five percent. You have got the pattern. Hard surge, active recovery. Keep repeating.',
      'Quarter through. Intervals working. The rest between surges is part of the mission — use it.',
    ],
    half: [
      'Halfway through the surge protocol. Anomaly is responding. Stay sharp — keep the pattern.',
      'Midpoint. Speed work is accumulating. Each surge trains a faster you. One more set.',
      'Fifty percent. Hard surges are working. Keep quality high on each effort — no coasting.',
    ],
    threeQuarter: [
      'Final surge incoming. Three quarters down. One last hard push — maximum effort, Runner.',
      'Seventy-five percent. Last set. Make these surges count — finish strong.',
      'Three quarters complete. Final interval sequence. Everything you have left — now.',
    ],
    complete: [
      'Surge Protocol complete. Anomaly suppressed. Speed capacity upgraded. Outstanding effort, Runner.',
      'All intervals done. Speed work filed. Your fast-twitch fibres just got faster.',
      'Interval mission complete. Top-end pace improved. That is how you get quicker.',
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
