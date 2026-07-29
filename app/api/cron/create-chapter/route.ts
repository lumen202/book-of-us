import { NextResponse } from "next/server";
import { ensureCurrentMonthChapter } from "@/lib/chapters/mutations";

/**
 * Vercel Cron hits this on the 1st of every month (schedule lives in
 * `vercel.json`) so a chapter exists to add photos to all month, independent
 * of Celebration Mode, which stays on the 5th (`isCelebrationDay`).
 *
 * Authenticated by a shared secret rather than a session — Vercel Cron
 * requests aren't signed in as anyone — matching the header Vercel sends
 * automatically when `CRON_SECRET` is set in the project's environment.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCurrentMonthChapter();
  return NextResponse.json({ ok: true });
}
