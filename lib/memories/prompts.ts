import { mulberry32 } from "@/lib/ambient/rng";

/**
 * A whispered suggestion above the composer's caption field — never a
 * required field, never a notification, never "prompt of the day." Lowers
 * the blank-page cost of adding a memory the way StoryWorth's recurring
 * prompt does, without turning this into a prompt-driven product — see
 * `docs/plans/feature-audit-market-research.md` §3.3.
 */
const PROMPTS: readonly string[] = [
  "What made today worth keeping?",
  "A small thing they did that you don't want to forget.",
  "Something that made you both laugh.",
  "What did today taste like, sound like, feel like?",
  "A moment you almost let pass by.",
  "Something ordinary that felt like enough.",
  "What would you want to remember about right now?",
  "A thing they said that stuck with you.",
  "The best part of today, in one sentence.",
  "Something you're grateful you got to see together.",
  "A small argument, already forgiven — worth writing down too.",
  "What surprised you today?",
];

/**
 * Deterministic per chapter-per-day, via the same seeded generator
 * `lib/ambient/rng.ts`/`lib/places/engine.ts`'s `dailyPick` use — so
 * refreshing the composer mid-visit doesn't swap the line out from under
 * whoever's mid-caption. Different chapters (and different days) get
 * different prompts; the same chapter on the same day always gets the same
 * one.
 */
export function pickComposerPrompt(chapterId: string, now: Date): string {
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let seed = 0;
  for (const char of `${chapterId}:${dayKey}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const rng = mulberry32(seed);
  return PROMPTS[Math.floor(rng() * PROMPTS.length)];
}
