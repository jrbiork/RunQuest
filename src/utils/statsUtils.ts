import type { CompletedRun } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekStats {
  weekIndex: number;      // 1-based week number within the month (1–5)
  weekLabel: string;      // e.g. "Week 1"
  dateRange: string;      // e.g. "Mar 1–7"
  runs: CompletedRun[];
  totalXp: number;
  totalRuns: number;
  totalDistanceKm: number;
  xpFraction: number;     // 0–1 relative to the max week in the month (for bar width)
}

export interface MonthStats {
  totalXp: number;
  totalRuns: number;
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
 * Groups runs into 4–5 calendar weeks for the given month.
 * Week 1 starts on the 1st of the month; each week spans Mon–Sun aligned to
 * calendar rows (same as the heatmap grid).
 */
export function getWeeklyBreakdown(
  runs: CompletedRun[],
  year: number,
  month: number,
): WeekStats[] {
  const totalDays = daysInMonth(year, month);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mName = monthNames[month] ?? '';

  // Build 7-day chunks starting from day 1
  const weeks: WeekStats[] = [];
  let weekIndex = 1;
  for (let startDay = 1; startDay <= totalDays; startDay += 7) {
    const endDay = Math.min(startDay + 6, totalDays);
    const weekRuns = runs.filter((run) => {
      const d = new Date(run.completedAt);
      const day = d.getDate();
      return day >= startDay && day <= endDay;
    });
    weeks.push({
      weekIndex,
      weekLabel: `Week ${weekIndex}`,
      dateRange: `${mName} ${startDay}–${endDay}`,
      runs: weekRuns,
      totalXp: weekRuns.reduce((s, r) => s + r.xpEarned, 0),
      totalRuns: weekRuns.length,
      totalDistanceKm: weekRuns.reduce((s, r) => s + r.distanceKm, 0),
      xpFraction: 0, // filled after max is known
    });
    weekIndex++;
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
    totalRuns: runs.length,
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
