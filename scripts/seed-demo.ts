/**
 * Seeds the demo schema with placeholder content — a fake couple, a few
 * chapters of photos, a bucket list in every state the UI branches on, some
 * vault items, and one soft-deleted memory/promise so the keeper archive has
 * something to demonstrate. Never touches the real (`public`) data; every
 * write here goes through a client opened with `db.schema: "demo"`, into the
 * `demo-memories`/`demo-vault` buckets — the same project as the real
 * account, isolated the same way the app itself is (see
 * lib/supabase/project.ts).
 *
 * This deliberately builds its own `@supabase/supabase-js` client rather than
 * importing `lib/supabase/admin.ts`'s `createAdminClient` — that file has
 * `import "server-only"` at the top, which throws outside the Next.js server
 * runtime, and this script runs standalone under `tsx`.
 *
 * Run once after applying `0001` through `0011_demo_schema.sql` and
 * `get_chapter_memories_demo.sql`, and after adding `demo` to Project
 * Settings → API → Data API Settings → Exposed schemas (see
 * docs/agent/codebase-map/demo.md for the full setup order). Safe to re-run:
 * every insert is guarded so a second run adds nothing new, it just confirms
 * what's already there.
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo.ts
 *
 * Needs from .env.local (the app's own file — no separate one for this):
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=
 *   DEMO_ACCOUNT_EMAIL=
 *   DEMO_ACCOUNT_PASSWORD=
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const DEMO_EMAIL = requireEnv("DEMO_ACCOUNT_EMAIL");
const DEMO_PASSWORD = requireEnv("DEMO_ACCOUNT_PASSWORD");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} — see the header of this file for the full .env.local shape.`);
    process.exit(1);
  }
  return value;
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  db: { schema: "demo" },
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Lorem Picsum: deterministic by seed, already sized server-side — no local resizing pipeline needed for placeholder content. */
function placeholderUrl(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function fetchPlaceholder(seed: string, width: number, height: number): Promise<Blob> {
  const response = await fetch(placeholderUrl(seed, width, height));
  if (!response.ok) throw new Error(`Placeholder fetch failed for seed "${seed}": ${response.status}`);
  return response.blob();
}

/** Same two-rendition convention `lib/media/uploadMemoryMedia.ts` writes, minus the client-side downscale step — Picsum already serves the right sizes. */
async function uploadPlaceholderPhoto(
  bucket: "demo-memories" | "demo-vault",
  folder: string,
  seed: string,
): Promise<{ storagePath: string; thumbnailPath: string; meta: { width: number; height: number } }> {
  const [original, thumb] = await Promise.all([
    fetchPlaceholder(seed, 1600, 1200),
    fetchPlaceholder(seed, 720, 540),
  ]);

  const storagePath = `${folder}/original.jpg`;
  const thumbnailPath = `${folder}/thumb.jpg`;

  for (const [path, blob] of [
    [storagePath, original],
    [thumbnailPath, thumb],
  ] as const) {
    const { error } = await admin.storage.from(bucket).upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw error;
  }

  return { storagePath, thumbnailPath, meta: { width: 1600, height: 1200 } };
}

/**
 * `auth.users` is global, not schema-scoped, so this is the one place the
 * demo/real split doesn't apply — the `db.schema: "demo"` option above only
 * affects PostgREST (`.from()`) calls, never the `/auth/v1/admin/*` endpoints
 * `auth.admin.*` methods hit.
 */
async function ensureDemoAuthUser(): Promise<string> {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email === DEMO_EMAIL);
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created demo auth user ${DEMO_EMAIL}`);
  return data.user.id;
}

async function ensureRelationship(): Promise<void> {
  const { data: existing } = await admin.from("relationship").select("id").maybeSingle();
  if (existing) return;

  const { error } = await admin.from("relationship").insert({
    started_at: "2024-02-14",
    partner_a_name: "Alex",
    partner_b_name: "Sam",
  });
  if (error) throw error;
  console.log("Seeded relationship");
}

type SeedChapter = { slug: string; title: string; month: string };

async function ensureChapters(chapters: SeedChapter[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const chapter of chapters) {
    const { data: existing } = await admin
      .from("chapters")
      .select("id")
      .eq("slug", chapter.slug)
      .maybeSingle();
    if (existing) {
      ids.set(chapter.slug, existing.id);
      continue;
    }

    const { data, error } = await admin
      .from("chapters")
      .insert({ slug: chapter.slug, title: chapter.title, month: chapter.month })
      .select("id")
      .single();
    if (error) throw error;
    ids.set(chapter.slug, data.id);
    console.log(`Seeded chapter ${chapter.title}`);
  }
  return ids;
}

type SeedMemory = {
  chapterSlug: string;
  title: string;
  occurredAt: string;
  seed: string;
  createdBy: string;
};

async function ensureMemory(input: SeedMemory, chapterId: string): Promise<string> {
  const { data: existing } = await admin
    .from("memories")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("title", input.title)
    .maybeSingle();
  if (existing) return existing.id;

  const memoryId = crypto.randomUUID();
  const { storagePath, thumbnailPath, meta } = await uploadPlaceholderPhoto(
    "demo-memories",
    `chapters/${chapterId}/${memoryId}`,
    input.seed,
  );

  const { error } = await admin.from("memories").insert({
    id: memoryId,
    chapter_id: chapterId,
    type: "photo",
    title: input.title,
    occurred_at: input.occurredAt,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    meta,
    created_by: input.createdBy,
  });
  if (error) throw error;
  console.log(`Seeded memory "${input.title}"`);
  return memoryId;
}

async function ensureBucketItem(input: {
  title: string;
  category: string;
  note?: string;
  status: "open" | "done";
  createdBy: string;
}): Promise<string> {
  const { data: existing } = await admin
    .from("bucket_list_items")
    .select("id")
    .eq("title", input.title)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: last } = await admin
    .from("bucket_list_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("bucket_list_items")
    .insert({
      title: input.title,
      category: input.category,
      note: input.note ?? null,
      status: input.status,
      position: (last?.position ?? -1) + 1,
      created_by: input.createdBy,
      completed_at: input.status === "done" ? "2026-06-15" : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`Seeded promise "${input.title}"`);
  return data.id;
}

async function attachAlbumPhoto(input: {
  itemId: string;
  title: string;
  seed: string;
  occurredAt: string;
  createdBy: string;
  asCover: boolean;
  chapterId?: string;
}): Promise<void> {
  const { data: existing } = await admin
    .from("memories")
    .select("id")
    .eq("bucket_list_item_id", input.itemId)
    .eq("title", input.title)
    .maybeSingle();
  if (existing) return;

  const memoryId = crypto.randomUUID();
  const { storagePath, thumbnailPath, meta } = await uploadPlaceholderPhoto(
    "demo-memories",
    `bucket-list/${input.itemId}/${memoryId}`,
    input.seed,
  );

  const { error } = await admin.from("memories").insert({
    id: memoryId,
    chapter_id: input.chapterId ?? null,
    bucket_list_item_id: input.itemId,
    type: "photo",
    title: input.title,
    occurred_at: input.occurredAt,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    meta,
    created_by: input.createdBy,
  });
  if (error) throw error;

  const patch: Record<string, unknown> = { cover_memory_id: memoryId };
  if (input.asCover && input.chapterId) patch.memory_id = memoryId;
  await admin.from("bucket_list_items").update(patch).eq("id", input.itemId).is("cover_memory_id", null);

  console.log(`Attached photo to promise (${input.title})`);
}

async function ensureVaultItem(input: { title: string; seed: string; createdBy: string }): Promise<void> {
  const { data: existing } = await admin
    .from("vault_items")
    .select("id")
    .eq("title", input.title)
    .maybeSingle();
  if (existing) return;

  const itemId = crypto.randomUUID();
  const { storagePath, thumbnailPath, meta } = await uploadPlaceholderPhoto(
    "demo-vault",
    `vault/${itemId}`,
    input.seed,
  );

  const { error } = await admin.from("vault_items").insert({
    id: itemId,
    title: input.title,
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    meta,
    created_by: input.createdBy,
  });
  if (error) throw error;
  console.log(`Seeded vault item "${input.title}"`);
}

async function main() {
  console.log(`Seeding demo schema at ${SUPABASE_URL}...`);

  const demoUserId = await ensureDemoAuthUser();
  await ensureRelationship();

  const chapterIds = await ensureChapters([
    { slug: "2026-06", title: "June 2026", month: "2026-06-01" },
    { slug: "2026-07", title: "July 2026", month: "2026-07-01" },
    { slug: "2026-08", title: "August 2026", month: "2026-08-01" },
  ]);

  const june = chapterIds.get("2026-06")!;
  const july = chapterIds.get("2026-07")!;
  const august = chapterIds.get("2026-08")!;

  await ensureMemory({ chapterSlug: "2026-06", title: "Rainy afternoon in", occurredAt: "2026-06-08", seed: "demo-1", createdBy: demoUserId }, june);
  await ensureMemory({ chapterSlug: "2026-06", title: "Farmers market", occurredAt: "2026-06-21", seed: "demo-2", createdBy: demoUserId }, june);
  await ensureMemory({ chapterSlug: "2026-07", title: "Beach day", occurredAt: "2026-07-04", seed: "demo-3", createdBy: demoUserId }, july);
  await ensureMemory({ chapterSlug: "2026-07", title: "Late-night fries", occurredAt: "2026-07-19", seed: "demo-4", createdBy: demoUserId }, july);
  await ensureMemory({ chapterSlug: "2026-08", title: "Sunday morning", occurredAt: "2026-08-02", seed: "demo-5", createdBy: demoUserId }, august);

  // Open promises — one plain, one with a reference photo (exercises
  // BucketItemRow's "with a picture" state on a not-yet-kept item).
  await ensureBucketItem({ title: "learn to make pasta from scratch", category: "food", status: "open", createdBy: demoUserId });
  const stargazing = await ensureBucketItem({ title: "go stargazing somewhere dark", category: "adventure", note: "away from the city lights", status: "open", createdBy: demoUserId });
  await attachAlbumPhoto({ itemId: stargazing, title: "what we're picturing", seed: "demo-stars", occurredAt: "2026-07-25", createdBy: demoUserId, asCover: false });

  // Kept promises — one with just a cover (also in a chapter), one with a
  // full multi-photo album (exercises the cover + grid split).
  const roadTrip = await ensureBucketItem({ title: "take a spontaneous road trip", category: "travel", status: "done", createdBy: demoUserId });
  await attachAlbumPhoto({ itemId: roadTrip, title: "Somewhere off Route 9", seed: "demo-road", occurredAt: "2026-06-15", createdBy: demoUserId, asCover: true, chapterId: june });

  const picnic = await ensureBucketItem({ title: "have a picnic at sunset", category: "date", status: "done", createdBy: demoUserId });
  await attachAlbumPhoto({ itemId: picnic, title: "The spread", seed: "demo-picnic-1", occurredAt: "2026-07-11", createdBy: demoUserId, asCover: true, chapterId: july });
  await attachAlbumPhoto({ itemId: picnic, title: "Golden hour", seed: "demo-picnic-2", occurredAt: "2026-07-11", createdBy: demoUserId, asCover: false });
  await attachAlbumPhoto({ itemId: picnic, title: "The walk back", seed: "demo-picnic-3", occurredAt: "2026-07-11", createdBy: demoUserId, asCover: false });

  await ensureVaultItem({ title: "just us", seed: "demo-vault-1", createdBy: demoUserId });
  await ensureVaultItem({ title: "silly one", seed: "demo-vault-2", createdBy: demoUserId });

  // One soft-deleted memory and one soft-deleted promise, so the keeper's
  // archive page (Removed) has something to demonstrate restore/purge on —
  // without this the archive would just read "nothing removed" forever.
  const forgettable = await ensureMemory({ chapterSlug: "2026-06", title: "Blurry one, oops", occurredAt: "2026-06-10", seed: "demo-blurry", createdBy: demoUserId }, june);
  await admin.from("memories").update({ deleted_at: new Date().toISOString() }).eq("id", forgettable).is("deleted_at", null);

  const abandoned = await ensureBucketItem({ title: "learn to juggle", category: "someday", status: "open", createdBy: demoUserId });
  await admin.from("bucket_list_items").update({ deleted_at: new Date().toISOString() }).eq("id", abandoned).is("deleted_at", null);

  console.log("\nDone. Sign in at /demo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
