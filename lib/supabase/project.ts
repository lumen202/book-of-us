/**
 * Which Postgres schema — `public` (real) or `demo` — the current request/
 * browser reads and writes. One cookie, one resolver, shared by `server.ts`,
 * `client.ts`, `middleware.ts`, and `admin.ts` so "which schema" logic lives
 * in exactly one place. Every query and mutation file under `lib` goes
 * through those to get a Supabase client and takes no schema argument
 * itself, so this is the only thing that needed to become schema-aware for
 * the whole app to work against either one unchanged.
 *
 * Both schemas live in the *same* Supabase project — a separate project per
 * demo turned out not to be available (account/billing constraint) — but
 * give the same hard isolation a separate project would: a client
 * instantiated with `db.schema: "demo"` cannot construct a query against
 * `public.*` no matter what code runs against it, the same way a client
 * pointed at a different project's URL couldn't.
 *
 * `bou_project` matches the existing `bou_visited` cookie naming
 * (`lib/visits/mutations.ts`).
 */
export const ACTIVE_PROJECT_COOKIE = "bou_project";

export type Project = "real" | "demo";

/** Postgres schema name for `db.schema`, one per project. */
export type Schema = "public" | "demo";

/** Absent or anything other than `"demo"` means the real project — the safe default if the cookie is ever missing or tampered with. */
export function resolveProject(cookieValue: string | undefined): Project {
  return cookieValue === "demo" ? "demo" : "real";
}

/** No `next/headers` in the browser — a plain `document.cookie` read for client components (`client.ts`, the upload helpers) that need the active project outside a Server Component/Action. */
export function resolveProjectFromDocumentCookie(): Project {
  if (typeof document === "undefined") return "real";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACTIVE_PROJECT_COOKIE}=`));
  return resolveProject(match?.split("=")[1]);
}

export function resolveSchema(project: Project): Schema {
  return project === "demo" ? "demo" : "public";
}

/**
 * Storage buckets are project-wide, not schema-scoped — a Postgres schema
 * doesn't reach Supabase Storage at all, so the demo project's isolation
 * needs its own bucket names rather than riding along with `db.schema`.
 * `demo-memories`/`demo-vault` sit in the same project as `memories`/`vault`.
 */
export function resolveBucketName(project: Project, bucket: "memories" | "vault"): string {
  return project === "demo" ? `demo-${bucket}` : bucket;
}
