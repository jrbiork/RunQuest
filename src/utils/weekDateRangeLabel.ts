import { parseLocalDate } from './dateUtils';

/** e.g. "Apr 5 – Apr 11" for the ISO week starting at `weekStartIso` (local calendar). */
export function formatWeekDateRangeLabel(weekStartIso: string): string {
  const start = parseLocalDate(weekStartIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}
