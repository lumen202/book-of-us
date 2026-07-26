/** Celebration Mode runs on the 5th of every month. Pure so it's trivially testable. */
export function isCelebrationDay(date: Date = new Date()): boolean {
  return date.getDate() === 5;
}
