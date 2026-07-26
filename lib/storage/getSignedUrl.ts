import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

/**
 * The `memories` Storage bucket is private, so a raw storage_path/thumbnail_path
 * is never directly renderable. This is the only path the app uses to turn one
 * into a usable URL — always called server-side (Server Components/Route
 * Handlers), never with the service key, so it's just as RLS-protected as any
 * other read.
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("memories")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}
