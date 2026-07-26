export type Chapter = {
  id: string;
  slug: string;
  title: string;
  month: string;
  atmosphere: Record<string, unknown>;
  cover_memory_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
