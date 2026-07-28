export type BucketCategory =
  | "travel"
  | "food"
  | "date"
  | "adventure"
  | "home"
  | "someday"
  | "other";

export type BucketStatus = "open" | "done";

/** Order here is the order the margin glyph cycles through on tap. */
export const CATEGORIES: { value: BucketCategory; label: string }[] = [
  { value: "travel", label: "Travel" },
  { value: "food", label: "Food" },
  { value: "date", label: "Date night" },
  { value: "adventure", label: "Adventure" },
  { value: "home", label: "Home" },
  { value: "someday", label: "Someday" },
  { value: "other", label: "Other" },
];

export type BucketListItem = {
  id: string;
  title: string;
  note: string | null;
  category: BucketCategory;
  status: BucketStatus;
  position: number;
  /** Date-only, `YYYY-MM-DD`. Matches `memories.occurred_at`. */
  completedAt: string | null;
  /**
   * The entire goal→memory conversion. Null on an open item, and — on
   * purpose — also null on an item completed without a photo. See
   * `completeItem` in `./mutations.ts`.
   */
  memoryId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
