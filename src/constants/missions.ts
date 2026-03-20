import type { MissionType } from '../types';

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
      'Easy Run',
      'Build Your Streak',
      'Steady Miles',
      'Foundation Run',
    ],
    subtitles: [
      'Keep it conversational — you should be able to chat.',
      'Slow and steady builds the habit.',
      'This is how champions start.',
      'Every great journey starts with an easy step.',
    ],
    descriptions: [
      'An easy effort run to build your aerobic base. Run at a pace where you could hold a full conversation. Focus on form over speed.',
      'Your body gets stronger during recovery. This easy run cements your streak and keeps momentum going.',
    ],
    motivationalFraming: [
      'Build your streak today.',
      'Consistency beats perfection.',
      'Show up. That\'s the mission.',
    ],
    completionMessages: [
      'Streak secured! You showed up and that\'s everything. 🔥',
      'Easy run in the books. Habit building in progress.',
      'That\'s how it\'s done. Consistent and steady.',
    ],
  },
  tempo: {
    type: 'tempo',
    titles: [
      'Tempo Mission',
      'Hold Your Pace',
      'Comfortably Hard',
      'Threshold Run',
    ],
    subtitles: [
      'Push to a comfortably hard effort. You should be working.',
      'This pace builds speed and mental toughness together.',
      'Unlock your next gear.',
    ],
    descriptions: [
      'A tempo run at a comfortably hard effort — you should feel challenged but controlled. This pace builds your lactate threshold and makes slower paces feel easier over time.',
      'Hold a sustained hard effort for the target duration. This is where you get faster.',
    ],
    motivationalFraming: [
      'Unlock speed XP.',
      'This is where you get faster.',
      'Embrace the discomfort — it\'s growth.',
    ],
    completionMessages: [
      'Tempo done! Your speed ceiling just went up. 🚀',
      'That uncomfortable push? That\'s you getting faster.',
      'Threshold run complete. Level unlocked.',
    ],
  },
  long: {
    type: 'long',
    titles: [
      'Long Run',
      'Unlock Endurance XP',
      'Distance Quest',
      'The Long Game',
    ],
    subtitles: [
      'Go slow, go far. Big XP awaits.',
      'Your biggest run of the week. Take your time.',
      'Endurance is built mile by mile.',
    ],
    descriptions: [
      'Your weekly long run. Keep the pace easy and focus on time on feet. This builds endurance, mental strength, and earns the highest XP reward of the week.',
      'The cornerstone of your training week. Run slow, run far, and earn big XP.',
    ],
    motivationalFraming: [
      'Big miles, big rewards.',
      'This is your crown jewel of the week.',
      'Unlock endurance XP.',
    ],
    completionMessages: [
      'Long run conquered! You\'re building something real. 🏆',
      'That distance is now yours forever. Amazing work.',
      'Long run done. Endurance level: ascending.',
    ],
  },
  recovery: {
    type: 'recovery',
    titles: [
      'Recovery Run',
      'Keep Momentum',
      'Active Recovery',
      'Easy Legs',
    ],
    subtitles: [
      'Super easy. Almost embarrassingly slow.',
      'Flush out the legs and keep the streak alive.',
      'This is self-care for runners.',
    ],
    descriptions: [
      'A very easy recovery run to flush out tired legs and maintain your streak. Run as slow as you need to. The goal is movement, not performance.',
      'Active recovery keeps blood flowing to your muscles and helps you bounce back faster. Keep it super easy.',
    ],
    motivationalFraming: [
      'Keep the momentum going.',
      'Recovery is part of training.',
      'Protect your streak.',
    ],
    completionMessages: [
      'Recovery run done! Your legs will thank you tomorrow. 💆',
      'Streak protected. Smart training.',
      'Recovery complete. You\'re taking care of yourself.',
    ],
  },
  interval: {
    type: 'interval',
    titles: [
      'Interval Mission',
      'Speed Challenge',
      'Sprint Protocol',
      'Power Surges',
    ],
    subtitles: [
      'Short bursts of speed. Massive XP.',
      'Push hard, recover, repeat.',
      'This is where speed is born.',
    ],
    descriptions: [
      'High-intensity intervals: run hard for a set period, recover, and repeat. These short bursts of speed unlock the biggest performance gains — and earn bonus XP.',
      'Alternate between hard efforts and easy recovery. This type of training is the fastest way to get faster.',
    ],
    motivationalFraming: [
      'Speed challenge activated.',
      'Unlock your top gear.',
      'Maximum effort, maximum reward.',
    ],
    completionMessages: [
      'Intervals crushed! You just unlocked a new speed level. ⚡',
      'That was hard. You did it anyway. That\'s elite.',
      'Speed session complete. Your VO2 max is smiling.',
    ],
  },
};

// ─── Motivational Greetings (for Home screen) ─────────────────────────────────

export const GREETINGS_BY_TIME = {
  morning: [
    'Rise and run! 🌅',
    'Morning miles await.',
    'The best run is the morning run.',
  ],
  afternoon: [
    'Lace up. Let\'s go.',
    'Afternoon run o\'clock.',
    'Mid-day mission ready.',
  ],
  evening: [
    'Evening warriors run too.',
    'Day\'s not done yet.',
    'Close the day strong.',
  ],
};

export const STREAK_MESSAGES = {
  0: [
    'Start your streak today.',
    'Every legend began at zero.',
    'Today\'s run starts everything.',
  ],
  1: ['Streak started! Don\'t break it.', 'Day 1. The journey begins.'],
  3: ['3 days strong! You\'re building something.', 'Three in a row. Habit forming.'],
  7: ['One week streak! 🔥 You\'re unstoppable.', 'Seven days. This is a real habit now.'],
  14: ['Two weeks! 🔥🔥 Incredible consistency.', 'Fourteen days straight. Legend status.'],
  30: ['30 day streak! 🏆 You\'re a running machine.'],
};

export const REST_DAY_MESSAGES = [
  'Rest day. Recovery is training too.',
  'No run today. Your body is rebuilding.',
  'Rest day — come back stronger tomorrow.',
  'Active rest. Stretch, walk, recover.',
];

export const WEEKLY_COMPLETE_MESSAGES = [
  'Weekly goal smashed! 🎉 You earned your bonus XP.',
  'Perfect week! Every mission completed.',
  'Full streak week! Legendary performance.',
];
