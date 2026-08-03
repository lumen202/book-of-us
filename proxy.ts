import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // `icon` is the generated favicon route (app/icon.tsx) — no file extension
    // in its URL, so the extension exclusion below doesn't catch it, and
    // without this it 307s to /login for anyone not already signed in
    // (including the browser's very first tab-icon request).
    "/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
