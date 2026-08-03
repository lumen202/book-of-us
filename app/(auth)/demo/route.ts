import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/supabase/project";

/**
 * The demo account's whole "login" — no form, no credentials to hand out.
 * Frictionless on purpose: this is the link you'd actually give someone.
 *
 * Signs in against the *same* Supabase project as the real accounts (a
 * separate project turned out not to be available) — `auth.users` is global,
 * not schema-scoped, so the demo account is just a third row in it. What
 * isolates it is `bou_project`: this route sets it to `"demo"` before
 * redirecting in, and from then on every Supabase client the app builds
 * (`lib/supabase/server.ts`, `client.ts`, `middleware.ts`) reads that cookie
 * and opens with `db.schema: "demo"`, so this session's queries can only ever
 * reach `demo.*` tables. `lib/supabase/middleware.ts` treats `/demo` as
 * public the same way `/login` is, so this can run without a session
 * already existing.
 */
export async function GET(request: Request) {
  const email = process.env.DEMO_ACCOUNT_EMAIL;
  const password = process.env.DEMO_ACCOUNT_PASSWORD;

  if (!email || !password) {
    return new NextResponse("The demo isn't set up yet.", { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "demo" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new NextResponse("Could not start the demo. Try again in a moment.", { status: 500 });
  }

  cookieStore.set(ACTIVE_PROJECT_COOKIE, "demo", { path: "/" });
  return NextResponse.redirect(new URL("/", request.url));
}
