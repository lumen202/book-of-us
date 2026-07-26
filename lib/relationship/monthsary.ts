/**
 * Full months elapsed between the relationship's start date and a reference
 * date, counting only year/month (not day) — safe because Celebration Mode
 * only ever renders this on the 5th, which is also the anniversary
 * day-of-month, so the day components always match.
 */
export function getMonthsaryNumber(startDate: Date, referenceDate: Date = new Date()): number {
  return (
    (referenceDate.getFullYear() - startDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - startDate.getMonth())
  );
}
