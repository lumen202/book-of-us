import "server-only";

import { cookies } from "next/headers";
import { ACTIVE_PROJECT_COOKIE, resolveProject, type Project } from "./project";

/**
 * Server-only counterpart to `project.ts`'s `resolveProjectFromDocumentCookie`
 * — split into its own file because `next/headers` can't be imported from
 * `project.ts` itself without making that file (used by the browser client
 * too) server-only by accident.
 *
 * For code that already holds a request/cookie store of its own (`server.ts`,
 * `middleware.ts`), read `bou_project` directly instead of calling this — it
 * exists for the handful of callers that don't (`getSignedUrl.ts`,
 * `getVaultSignedUrl.ts`, `purgeMemory`, `purgeVaultItem`), which need to
 * know the active project purely to pick a bucket name or an admin schema.
 */
export async function getActiveProjectFromCookies(): Promise<Project> {
  const cookieStore = await cookies();
  return resolveProject(cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value);
}
