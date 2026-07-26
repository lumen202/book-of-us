# BUG-002: root middleware.ts used deprecated Next.js 16 convention
- **Found:** 2026-07-26
- **Where:** repo root `middleware.ts`
- **Symptom:** `npm run build` printed `The "middleware" file convention is deprecated. Please
  use "proxy" instead.` Next.js 16 renamed the root middleware file/export to `proxy.ts` /
  `export function proxy(...)`; functionality is unchanged, only the name is.
- **Status:** fixed (2026-07-26) — renamed `middleware.ts` to `proxy.ts`, exported function
  renamed `middleware` -> `proxy`, matcher config unchanged. Updated references in
  `docs/agent/codebase-map/{overview,auth}.md`. Verified with a clean `npm run build` (warning
  gone).
