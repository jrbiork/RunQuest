import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setDateOffsetMs, getDateOffsetMs } from '../utils/dateUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DevStore {
  dayOffset: number; // integer days (can be negative)
  adjustDay: (delta: number) => void;
  resetDateOffset: () => void;
}

export const useDevStore = create<DevStore>()(
  persist(
    (set, get) => ({
      dayOffset: 0,

      adjustDay: (delta: number) => {
        const next = get().dayOffset + delta;
        setDateOffsetMs(next * MS_PER_DAY);
        set({ dayOffset: next });
      },

      resetDateOffset: () => {
        setDateOffsetMs(0);
        set({ dayOffset: 0 });
      },
    }),
    {
      name: 'runquest-dev',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Re-apply the persisted offset on app boot
        if (state && state.dayOffset !== 0) {
          setDateOffsetMs(state.dayOffset * MS_PER_DAY);
        }
      },
    },
  ),
);

/** Convenience selector: formatted mocked date string for display */
export function getMockedDateLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Today (real)';
  const d = new Date(Date.now() + dayOffset * MS_PER_DAY);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${label} (${dayOffset > 0 ? '+' : ''}${dayOffset}d)`;
}
