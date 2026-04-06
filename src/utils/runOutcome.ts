import type { CompletedRun, MissionOutcome } from '../types';

/** Legacy persisted value before partial_time / incomplete. */
const LEGACY_FAILED = 'failed_goal' as const;

export function resolveOutcome(run: CompletedRun): MissionOutcome {
  const raw = run.outcome as MissionOutcome | typeof LEGACY_FAILED | undefined;
  if (raw === LEGACY_FAILED) return 'incomplete';
  if (raw) return raw;
  return run.goalMet ? 'success' : 'incomplete';
}

/** Counts toward "missions" totals: finished on time or over time with distance goal met. */
export function isMissionCompletedOrPartial(run: CompletedRun): boolean {
  const o = resolveOutcome(run);
  return o === 'success' || o === 'partial_time';
}

export function isAbortedRun(run: CompletedRun): boolean {
  return resolveOutcome(run) === 'aborted';
}
