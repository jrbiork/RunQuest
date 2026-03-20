import { useUserStore } from '../store/userStore';
import { isStreakAlive } from '../utils/dateUtils';

export interface StreakInfo {
  streak: number;
  isAlive: boolean;
  isOnFire: boolean;   // 7+ days
  isLegendary: boolean; // 30+ days
  message: string;
}

export function useStreak(): StreakInfo {
  const streak = useUserStore((s) => s.streak);
  const lastRunDate = useUserStore((s) => s.lastRunDate);

  const isAlive = isStreakAlive(lastRunDate);
  const isOnFire = streak >= 7;
  const isLegendary = streak >= 30;

  let message = '';
  if (streak === 0) {
    message = 'Start your streak today!';
  } else if (!isAlive) {
    message = 'Your streak ended. Start a new one!';
  } else if (isLegendary) {
    message = `${streak} days on fire! Legendary.`;
  } else if (isOnFire) {
    message = `${streak} day streak! You're unstoppable.`;
  } else if (streak >= 3) {
    message = `${streak} days strong. Keep it up!`;
  } else if (streak === 1) {
    message = 'Day 1. The journey begins.';
  } else {
    message = `${streak} day streak. Building momentum.`;
  }

  return { streak, isAlive, isOnFire, isLegendary, message };
}
