import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { recordPartnerVisit, VISIT_COOKIE } from "@/lib/visits/mutations";

/**
 * Refreshes the Supabase session on every request and gates every route
 * except /login behind it. This is the entire auth model: two accounts,
 * pre-created in the Supabase dashboard, no signup route.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
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
