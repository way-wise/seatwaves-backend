// UTC-safe helpers (no local time/DST risk)

const MS_PER_DAY = 86_400_000;

export function startOfUTCDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

export function endOfUTCDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

export function addDaysUTC(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export function getUTCDay(d: Date): number {
  // 0=Sunday ... 6=Saturday (like Date.prototype.getUTCDay)
  return d.getUTCDay();
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function clampUTC(d: Date, start: Date, end: Date): Date | null {
  if (d < start || d > end) return null;
  return d;
}

/** Inclusive days between two UTC-midnight dates */
export function daysBetweenUTC(a: Date, b: Date): number {
  const a0 = startOfUTCDay(a).getTime();
  const b0 = startOfUTCDay(b).getTime();
  return Math.floor((b0 - a0) / MS_PER_DAY);
}

/** Return the Sunday (0) of the week (UTC) containing date d */
export function startOfUTCWeek_Sun(d: Date): Date {
  const day = getUTCDay(d); // 0..6
  return addDaysUTC(startOfUTCDay(d), -day);
}
