import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ACTIVE_PROJECT_COOKIE, resolveProject, resolveSchema } from "./project";

/**
 * Server-side Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads the session from cookies; proxy.ts is
 * responsible for keeping that session fresh on every request.
 *
 * Also reads `bou_project` (see `./project.ts`) to decide whether this
 * request is a demo visit, and if so points every `.from()`/`.rpc()` call at
 * the `demo` schema instead of `public` — every caller of this function is
 * automatically demo-aware for free, with no change needed on their end.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const schema = resolveSchema(resolveProject(cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no request/response to
            // write to — safe to ignore because middleware.ts refreshes the
            // session on every navigation anyway.
          }
        },
      },
    },
  );
}
