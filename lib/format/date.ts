const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Formats a Postgres `date` (YYYY-MM-DD, no time component) by parsing the
 * string directly instead of `new Date(iso)` — the latter parses as UTC
 * midnight, which `toLocaleDateString()` can then render as the *previous*
 * day in negative-UTC-offset timezones. Manual parsing sidesteps that
 * entirely for values that never had a time component to begin with.
 */
export function parseDateOnly(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

/** A `Date` at local midnight for a date-only string — safe for calendar math (year/month/day getters). */
export function toLocalDate(isoDate: string): Date {
  const { year, month, day } = parseDateOnly(isoDate);
  return new Date(year, month - 1, day);
}

export function formatMonthYear(isoDate: string): string {
  const { year, month } = parseDateOnly(isoDate);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** For dates the app computed itself (not read from Postgres), e.g. the next chapter's arrival. */
export function formatMonthDay(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function formatFullDate(isoDate: string): string {
  const { year, month, day } = parseDateOnly(isoDate);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}
