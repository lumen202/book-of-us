/**
 * A small, deliberately curated set rather than Facebook's stock six —
 * "Like" and "Angry" don't belong in a two-person memory book. Order is the
 * order they're offered in the picker.
 */
export const REACTION_EMOJIS = ["❤️", "😂", "🥹", "😮", "😍"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type Reaction = {
  memoryId: string;
  userId: string;
  emoji: string;
};
