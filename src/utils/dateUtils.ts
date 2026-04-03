import type { DayOfWeek } from '../types';

const DAY_NAMES: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Dev date mocking ─────────────────────────────────────────────────────────
// Offset in milliseconds added to real Date.now() for testing date-sensitive logic.
let _dateOffsetMs = 0;

export function setDateOffsetMs(ms: number) {
  _dateOffsetMs = ms;
}

export function getDateOffsetMs(): number {
  return _dateOffsetMs;
}

/** Returns the mocked "now" timestamp (real time + any test offset). */
export function getNow(): Date {
  return new Date(Date.now() + _dateOffsetMs);
}

/** ISO timestamp for the current app time (matches dev date offset). Use for `completedAt` so stats/calendar align with `getTodayISO()`. */
export function getNowISOString(): string {
  return getNow().toISOString();
}

// Returns today as YYYY-MM-DD
export function getTodayISO(): string {
  return toISODate(getNow());
}

// Returns a Date from a YYYY-MM-DD string (local time, not UTC)
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year as number, (month as number) - 1, day as number);
}

// Returns YYYY-MM-DD for a given Date
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns the Monday of the week containing `date`
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStartISO(date: Date = getNow()): string {
  return toISODate(getWeekStart(date));
}

// Returns true if the streak is still alive: last run was within 2 calendar days of "today"
// (allows one full rest day between run days, e.g. Fri → Sun).
export function isStreakAlive(lastRunDate: string | null): boolean {
  if (!lastRunDate) return false;
  const today = parseLocalDate(getTodayISO());
  const last = parseLocalDate(lastRunDate);
  const diffMs = today.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

// Returns true if the stored weekStartDate is not this week's Monday
export function isNewWeek(storedWeekStart: string | null): boolean {
  if (!storedWeekStart) return true;
  return storedWeekStart !== getWeekStartISO();
}

// Given an array of DayOfWeek, return the ISO dates for this week's occurrences
export function getScheduledDatesForWeek(
  runDays: DayOfWeek[],
  weekStart: Date = getWeekStart(),
): string[] {
  return runDays.map((day) => {
    const idx = DAY_NAMES.indexOf(day);
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
    return toISODate(d);
  }).sort();
}

// Returns DayOfWeek for a given ISO date string
export function getDayOfWeek(dateStr: string): DayOfWeek {
  const date = parseLocalDate(dateStr);
  const jsDay = date.getDay(); // 0=Sun
  const idx = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0 index
  return DAY_NAMES[idx] as DayOfWeek;
}

// Returns a friendly relative label: "Today", "Tomorrow", "Mon", etc.
export function getRelativeDateLabel(dateStr: string): string {
  const today = getTodayISO();
  const tomorrow = toISODate(new Date(parseLocalDate(today).getTime() + 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return getDayOfWeek(dateStr);
}

// Returns number of days between two ISO date strings (b - a)
export function daysBetween(a: string, b: string): number {
  const dateA = parseLocalDate(a);
  const dateB = parseLocalDate(b);
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

// Formats a date for display: "Mon, Mar 18"
export function formatDateDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Returns the hour of the day (0-23) for time-of-day greetings
export function getHourOfDay(): number {
  return getNow().getHours();
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = getHourOfDay();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
