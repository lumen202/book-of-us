export type MemoryType =
  | "photo"
  | "video"
  | "audio"
  | "letter"
  | "chat"
  | "song"
  | "location"
  | "milestone"
  | "text";

export type Memory = {
  id: string;
  chapter_id: string | null;
  type: MemoryType;
  title: string;
  body: string | null;
  occurred_at: string;
  storage_path: string | null;
  thumbnail_path: string | null;
  meta: Record<string, unknown>;
  unlock_at: string | null;
  /** Set when this memory is a bucket-list promise's cover — see `docs/agent/codebase-map/bucket-list.md`. */
  bucket_list_item_id: string | null;
  /** Set when this memory is filed under a trip — see `docs/agent/codebase-map/trips.md`. */
  trip_id: string | null;
  /** Opted out of `lib/surprises/` resurfacing by hand — see `docs/agent/codebase-map/surprises.md`. */
  resurface_excluded: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
