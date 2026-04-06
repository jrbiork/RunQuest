import type { CompletedRun } from '../types';
import { isMissionCompletedOrPartial } from './runOutcome';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekStats {
  weekIndex: number;      // 1-based week number within the month (1–5)
  weekLabel: string;      // e.g. "Week 1"
  dateRange: string;      // e.g. "Mar 1–7"
  startIso: string;       // YYYY-MM-DD of the first day of this row
  endIso: string;         // YYYY-MM-DD of the last day of this row
  runs: CompletedRun[];
  totalXp: number;
  totalMissions: number;
  totalDistanceKm: number;
  xpFraction: number;     // 0–1 relative to the max week in the month (for bar width)
}

export interface MonthStats {
  totalXp: number;
  totalMissions: number;
  totalDistanceKm: number;
  weeks: WeekStats[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a "YYYY-MM-DD" string for the given Date in local time. */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the number of days in a given month (0-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns a Map from "YYYY-MM-DD" → CompletedRun[] for quick O(1) calendar lookup.
 * Only includes runs that fall in the given year/month (0-indexed).
 */
export function getDayMap(
  runHistory: CompletedRun[],
  year: number,
  month: number,
): Map<string, CompletedRun[]> {
  const map = new Map<string, CompletedRun[]>();
  for (const run of runHistory) {
    const d = new Date(run.completedAt);
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = toLocalDateStr(d);
    const existing = map.get(key) ?? [];
    existing.push(run);
    map.set(key, existing);
  }
  return map;
}

/**
 * Returns all runs that completed in the given year/month (0-indexed month).
 */
export function getRunsForMonth(
  runHistory: CompletedRun[],
  year: number,
  month: number,
): CompletedRun[] {
  return runHistory.filter((run) => {
    const d = new Date(run.completedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/**
 * Groups runs into real Monday-aligned calendar weeks that overlap with the
 * given month. startIso/endIso are the full Mon–Sun boundaries (may extend
 * outside the month); dateRange is clamped to the month for display.
 * A new week only starts on Monday — Sunday belongs to the previous week.
 */
export function getWeeklyBreakdown(
  runs: CompletedRun[],
  year: number,
  month: number,
): WeekStats[] {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mName = monthNames[month] ?? '';

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Find the Monday on or before the 1st of the month
  const dow = firstOfMonth.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const firstMonday = new Date(firstOfMonth);
  firstMonday.setDate(firstMonday.getDate() - daysToMonday);

  const weeks: WeekStats[] = [];
  let weekIndex = 1;
  let cursor = new Date(firstMonday);

  while (cursor <= lastOfMonth) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    // Clamp display range to this month's days
    const displayStart = weekStart < firstOfMonth ? firstOfMonth : weekStart;
    const displayEnd = weekEnd > lastOfMonth ? lastOfMonth : weekEnd;

    // Collect runs that fall anywhere in the full Mon–Sun span
    const weekRuns = runs.filter((run) => {
      const d = new Date(run.completedAt);
      return d >= weekStart && d <= weekEnd;
    });

    // Build display date range label (clamped to month)
    const startDay = displayStart.getDate();
    const endDay = displayEnd.getDate();
    const dateRange = startDay === endDay
      ? `${mName} ${startDay}`
      : `${mName} ${startDay}–${endDay}`;

    const missionRuns = weekRuns.filter(isMissionCompletedOrPartial);
    weeks.push({
      weekIndex,
      weekLabel: `Week ${weekIndex}`,
      dateRange,
      startIso: toLocalDateStr(weekStart),   // actual Monday (may be prior month)
      endIso: toLocalDateStr(weekEnd),        // actual Sunday (may be next month)
      runs: weekRuns,
      totalXp: weekRuns.reduce((s, r) => s + r.xpEarned, 0),
      totalMissions: missionRuns.length,
      totalDistanceKm: weekRuns.reduce((s, r) => s + r.distanceKm, 0),
      xpFraction: 0,
    });

    weekIndex++;
    cursor.setDate(cursor.getDate() + 7);
  }

  // Normalise bar widths relative to the best week
  const maxXp = Math.max(...weeks.map((w) => w.totalXp), 1);
  for (const w of weeks) {
    w.xpFraction = w.totalXp / maxXp;
  }

  return weeks;
}

/**
 * Returns the full month stats including week breakdown.
 */
export function getMonthStats(
  runHistory: CompletedRun[],
  year: number,
  month: number,
): MonthStats {
  const runs = getRunsForMonth(runHistory, year, month);
  const weeks = getWeeklyBreakdown(runs, year, month);
  return {
    totalXp: runs.reduce((s, r) => s + r.xpEarned, 0),
    totalMissions: runs.filter(isMissionCompletedOrPartial).length,
    totalDistanceKm: runs.reduce((s, r) => s + r.distanceKm, 0),
    weeks,
  };
}

/** Month name from 0-indexed month number. */
export function getMonthName(month: number): string {
  const names = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  return names[month] ?? '';
}
