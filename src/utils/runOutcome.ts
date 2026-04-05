import type { CompletedRun, MissionOutcome } from '../types';

/** Legacy persisted value before partial_time / incomplete. */
const LEGACY_FAILED = 'failed_goal' as const;

export function resolveOutcome(run: CompletedRun): MissionOutcome {
  const raw = run.outcome as MissionOutcome | typeof LEGACY_FAILED | undefined;
  if (raw === LEGACY_FAILED) return 'incomplete';
  if (raw) return raw;
  return run.goalMet ? 'success' : 'incomplete';
}
