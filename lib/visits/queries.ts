import "server-only";

import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export type VisitStats = {
  total: number;
  lastVisitedAt: string | null;
};

/** Keeper-only — throws for anyone else, same as every other keeper query. */
export async function getPartnerVisitStats(): Promise<VisitStats> {
  await requireAdmin();
  const supabase = await createClient();

  const [{ count }, { data: latest }] = await Promise.all([
    supabase.from("partner_visits").select("*", { count: "exact", head: true }),
    supabase
      .from("partner_visits")
      .select("visited_at")
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return { total: count ?? 0, lastVisitedAt: latest?.visited_at ?? null };
}
