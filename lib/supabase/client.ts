import { createBrowserClient } from "@supabase/ssr";
import { resolveProjectFromDocumentCookie, resolveSchema } from "./project";

/**
 * Browser-side Supabase client. Only used where interactivity genuinely needs
 * it (e.g. the composer's file upload with progress). Server Components and
 * Server Actions should use lib/supabase/server.ts instead.
 *
 * Reads `bou_project` the same way `server.ts` does (see `./project.ts`), so
 * a query or upload from a demo visit targets the `demo` schema, never the
 * real one.
 */
export function createClient() {
  const schema = resolveSchema(resolveProjectFromDocumentCookie());
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema } },
  );
}
