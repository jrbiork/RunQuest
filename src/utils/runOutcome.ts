import type { CompletedRun, MissionOutcome } from '../types';

export function resolveOutcome(run: CompletedRun): MissionOutcome {
  if (run.outcome) return run.outcome;
  return run.goalMet ? 'success' : 'failed_goal';
}
