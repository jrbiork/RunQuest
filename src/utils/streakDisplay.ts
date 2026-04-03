import type { CompletedRun } from '../types';
import { parseLocalDate, toISODate } from './dateUtils';

function runDayKey(completedAt: string): string {
  return toISODate(new Date(completedAt));
}

function daysBetweenDateKeys(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/**
 * 0-based streak day index for a run: first distinct run day in a chain = 0, next = 1, …
 * Chains are built from sorted distinct local dates where each step is ≤2 days apart
 * (so one rest day between runs — e.g. Fri → Sun still counts as consecutive).
 */
export function getStreakDayIndex0(run: CompletedRun, runHistory: CompletedRun[]): number {
  const keys = [...new Set(runHistory.map((r) => runDayKey(r.completedAt)))].sort();
  if (keys.length === 0) return 0;

  const runKey = runDayKey(run.completedAt);
  const chains: string[][] = [];
  let current: string[] = [keys[0]!];

  for (let i = 1; i < keys.length; i++) {
    const prev = keys[i - 1]!;
    const k = keys[i]!;
    const gap = daysBetweenDateKeys(prev, k);
    if (gap <= 2) {
      current.push(k);
    } else {
      chains.push(current);
      current = [k];
    }
  }
  chains.push(current);

  const chain = chains.find((c) => c.includes(runKey));
  if (!chain) return 0;
  const idx = chain.indexOf(runKey);
  return idx >= 0 ? idx : 0;
}
