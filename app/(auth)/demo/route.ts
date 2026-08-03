import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/supabase/project";

/**
 * A 200, not a redirect. This URL gets pasted into places that check "does
 * this link work" without a browser behind them (portfolio sites, link
 * validators) — those typically don't carry a `Set-Cookie` from one hop to
 * the next the way a real browser does, so a 307 to `/` ends with the
 * cookie-less second request bounced again by the middleware, straight to
 * `/login`. A validator that flags a redirect chain — or the non-2xx status
 * on the URL it was actually given — reads that as "can't access the link,"
 * even though a real browser sails through it. Returning 200 HTML directly
 * from this URL, with the cookies already set and a meta-refresh doing the
 * hop for anything that renders it, sidesteps that entirely.
 */
function demoLandingPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=/" />
    <title>The Book of Us — Demo</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf7f2;font-family:Georgia,'Times New Roman',serif;color:#3d3128;">
    <p style="font-size:1.1rem;">
      Opening the demo… <a href="/" style="color:#3d3128;">continue</a>
    </p>
  </body>
</html>`;
}

/**
 * The demo account's whole "login" — no form, no credentials to hand out.
 * Frictionless on purpose: this is the link you'd actually give someone.
 *
 * Signs in against the *same* Supabase project as the real accounts (a
 * separate project turned out not to be available) — `auth.users` is global,
 * not schema-scoped, so the demo account is just a third row in it. What
 * isolates it is `bou_project`: this route sets it to `"demo"` before
 * handing off to `/`, and from then on every Supabase client the app builds
 * (`lib/supabase/server.ts`, `client.ts`, `middleware.ts`) reads that cookie
 * and opens with `db.schema: "demo"`, so this session's queries can only ever
 * reach `demo.*` tables. `lib/supabase/middleware.ts` treats `/demo` as
 * public the same way `/login` is, so this can run without a session
 * already existing.
 */
export async function GET(_request: Request) {
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
  return new NextResponse(demoLandingPage(), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
