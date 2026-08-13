"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { recordSurpriseShown } from "@/lib/relationship/mutations";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/supabase/project";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Reset to the real project — otherwise a demo visit leaves the browser
  // routed to the demo project on the next visit, including to /login itself.
  (await cookies()).delete(ACTIVE_PROJECT_COOKIE);
  redirect("/login");
}

/** `SurprisePrint` fires this once, on mount, to put the cooldown to work. */
export async function markSurpriseShown(memoryId: string) {
  await recordSurpriseShown(memoryId);
}
