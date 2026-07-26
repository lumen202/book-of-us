/** Rotates on each Celebration Mode view — picked server-side so it's stable through hydration. */
export const monthsaryMessages: readonly string[] = [
  "Another month, still choosing each other.",
  "Same love, new month.",
  "Here's to one more page in our book.",
  "Still my favorite person, one month later.",
  "No milestone needed — just glad it's still us.",
];

export function pickMonthsaryMessage(random: () => number = Math.random): string {
  const index = Math.floor(random() * monthsaryMessages.length);
  return monthsaryMessages[index];
}
