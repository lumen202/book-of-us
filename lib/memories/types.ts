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
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
