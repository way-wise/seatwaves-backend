import { addDays } from 'date-fns'; // used sparingly, we prefer UTC helpers
import {
  addDaysUTC,
  clampUTC,
  daysBetweenUTC,
  getUTCDay,
  maxDate,
  minDate,
  startOfUTCDay,
  startOfUTCWeek_Sun,
} from 'src/common/utc';

export type RecurringRules = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  byday?: string[]; // Only for WEEKLY
  until?: string; // ISO string (UTC)
  count?: number;
};

const ICAL_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
type ICalDay = (typeof ICAL_DAYS)[number];

function parseBydayIndices(byday?: string[]): number[] | undefined {
  if (!byday || byday.length === 0) return undefined;
  const map = byday
    .map((d) => ICAL_DAYS.indexOf(d as ICalDay))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b);
  return map.length ? map : undefined;
}

/**
 * Expand occurrences between [windowStart, windowEnd] (both UTC day boundaries, inclusive),
 * honoring DAILY/WEEKLY rules and interval;
 * anchor week intervals to the DTSTART week (Sunday-start week).
 */
export function expandWindowUTC(
  rules: RecurringRules,
  dtstart: Date, // first occurrence anchor (UTC)
  windowStart: Date, // UTC day start
  windowEnd: Date, // UTC day end
  maxResults = 1000,
): Date[] {
  const list: Date[] = [];
  const interval = Math.max(1, rules.interval ?? 1);

  // Optional overall cap (until)
  let hardEnd = windowEnd;
  if (rules.until) {
    const until = new Date(rules.until);
    hardEnd = minDate(hardEnd, until);
  }

  if (hardEnd < windowStart) return list;

  const firstDay = startOfUTCDay(dtstart);
  const from = startOfUTCDay(maxDate(windowStart, firstDay)); // never before DTSTART

  if (rules.frequency === 'DAILY') {
    // Start at 'from', step 'interval' days until hardEnd
    // Compute offset days to align on interval from DTSTART
    const offsetDays = daysBetweenUTC(firstDay, from);
    const remainder = offsetDays % interval;
    let cursor =
      remainder === 0 ? from : addDaysUTC(from, interval - remainder);

    while (cursor <= hardEnd) {
      list.push(cursor);
      if (list.length >= maxResults) break;
      cursor = addDaysUTC(cursor, interval);
    }
    return list;
  }

  if (rules.frequency === 'WEEKLY') {
    const bydayIdx = parseBydayIndices(rules.byday) ?? [getUTCDay(firstDay)];
    // Anchor weekly intervals to DTSTART's Sunday-start week
    const dtstartWeek0 = startOfUTCWeek_Sun(firstDay);

    // Find the first weekStart (Sunday) within the window that aligns with interval
    let weekStart = startOfUTCWeek_Sun(from);
    while (true) {
      const weeksFromStart = Math.floor(
        daysBetweenUTC(dtstartWeek0, weekStart) / 7,
      );
      if (weeksFromStart % interval === 0) break;
      weekStart = addDaysUTC(weekStart, 7);
      if (weekStart > hardEnd) return list;
    }

    // Iterate weeks
    while (weekStart <= hardEnd) {
      // Emit each byday occurrence in this aligned week
      for (const dayIdx of bydayIdx) {
        const occ = addDaysUTC(weekStart, dayIdx); // Sunday(0) + dayIdx
        if (occ < from || occ > hardEnd) continue;
        list.push(occ);
        if (list.length >= maxResults) return list;
      }
      weekStart = addDaysUTC(weekStart, 7 * interval);
    }

    return list;
  }

  // Fallback: no occurrences
  return list;
}

/** Get the next (soonest) UTC date that matches rules, at/after 'fromUTC' */
export function nextOccurrenceUTC(
  rules: RecurringRules,
  dtstart: Date,
  fromUTC: Date,
  lookaheadDays = 365,
): Date | null {
  const winStart = startOfUTCDay(fromUTC);
  const winEnd = addDaysUTC(winStart, lookaheadDays);
  const occ = expandWindowUTC(rules, dtstart, winStart, winEnd, 1);
  return occ.length ? occ[0] : null;
}
