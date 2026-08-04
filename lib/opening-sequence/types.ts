import type { LoveLetter } from "@/lib/relationship/types";

/**
 * One photograph from the month being celebrated, for the ceremony's look back.
 *
 * Deliberately not `MemoryWithMedia`: the opening needs a picture, a caption and
 * a date, and giving it the whole memory row would let the ceremony grow
 * opinions about reactions, notes, storage paths and soft-deletion that belong
 * to the album. Kept to what a slideshow can actually use.
 */
export type MonthPrint = {
  id: string;
  url: string;
  title: string;
  occurredAt: string;
};

export type OpeningSceneProps = {
  title: string;
  subtitle?: string;
  reducedMotion: boolean;
  /** Only rendered by celebration-flagged scenes (e.g. GoldenHour) — base scenes ignore these. */
  celebrationLabel?: string;
  celebrationMessage?: string;
  /**
   * The couple's own replacement for `MonthsaryOpening`'s built-in letter, from
   * Settings (`lib/relationship/queries.ts`'s `getLoveLetter`). When absent, the
   * scene falls back to its hand-written default copy.
   */
  letter?: LoveLetter;
  /**
   * The couple's own replacement for the `whisper` beat's spoken lines, from
   * Settings (`getWhisperLines`). When absent, falls back to `monthsaryWhispers()`.
   */
  whisperLines?: string[];
  /**
   * Which monthsary this is. Copy branches on it — "another month" is false on
   * the first one, and a line bent to be true in every case reads like a form
   * letter. See `whispers.ts` and `lib/celebration/messages.ts`.
   */
  monthsaryNumber?: number;
  /**
   * This month's photographs. May be empty — an early month, or a month nobody
   * has filled in yet — and every scene that uses these has to skip its look-back
   * beat entirely rather than showing an empty frame.
   */
  monthPrints?: MonthPrint[];
  /** Called once this scene's intro animation has finished playing. */
  onIntroComplete: () => void;
};
