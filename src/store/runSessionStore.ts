import { create } from 'zustand';

interface RunSessionStore {
  isRunActive: boolean;
  setRunActive: (active: boolean) => void;
}

/** Non-persisted runtime store — tracks whether a GPS run is in progress.
 *  Used by the root layout to gate swipe-to-dismiss on the run modal. */
export const useRunSessionStore = create<RunSessionStore>((set) => ({
  isRunActive: false,
  setRunActive: (active) => set({ isRunActive: active }),
}));
