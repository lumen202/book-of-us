import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { recordPartnerVisit, VISIT_COOKIE } from "@/lib/visits/mutations";
import { ACTIVE_PROJECT_COOKIE, resolveProject, resolveSchema } from "./project";

/**
 * Refreshes the Supabase session on every request and gates every route
 * except /login (real) and /demo (the demo account's own sign-in) behind
 * it. Two auth models share this file now: the real one (two accounts,
 * pre-created in the Supabase dashboard, no signup route) and the demo one
 * (one account, auto-signed-in by `app/(auth)/demo/route.ts`) — which one
 * applies to a given request is read from `bou_project`
 * (`lib/supabase/project.ts`), the same cookie `server.ts`/`client.ts` check.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const activeProject = resolveProject(
    request.cookies.get(ACTIVE_PROJECT_COOKIE)?.value,
  );
  const schema = resolveSchema(activeProject);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  // /demo is public the same way /login is — it's what *establishes* a demo
  // session, so it can't itself require one. Its own route handler owns
  // redirecting once signed in.
  const isDemoEntry = pathname.startsWith("/demo");

  if (!user && !isLoginRoute && !isDemoEntry) {
    const redirectUrl = request.nextUrl.clone();
    // A demo session that's gone missing (expired, cleared) has no
    // credentials for the real /login form — send it back to the one entry
    // that can re-establish it instead of a dead end.
    redirectUrl.pathname = activeProject === "demo" ? "/demo" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const alreadyMarkedThisSession = request.cookies.has(VISIT_COOKIE);
    const recorded = await recordPartnerVisit(supabase, user.email, alreadyMarkedThisSession);
    if (recorded) {
      // No maxAge — a session cookie, cleared when the browser itself closes,
      // which is what makes this mean "a new sitting" rather than every page.
      supabaseResponse.cookies.set(VISIT_COOKIE, "1", { path: "/" });
    }
  }

  return supabaseResponse;
}
