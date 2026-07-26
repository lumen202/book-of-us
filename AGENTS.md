<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The Book of Us — agent framework

Before doing anything else in this repo, read **`docs/agent/INDEX.md`** — it is the entry point
for orientation, past work, and known issues, and links to everything else so you never need to
scan the whole `docs/agent/` tree at once. It explains what this project is, the stack, the
folder layout, and the invariants that must not be silently broken (no raw memory reads, no hard
deletes, no logic duplicated outside `lib/`).

Three living doc trees make up the framework for working on this project across sessions
(structured as small per-topic/per-entry files with index tables, not a few giant files, so
orientation stays cheap even after years of accumulated history):

- **`docs/agent/codebase-map/`** (start at its `INDEX.md`) — orientation: what exists, where,
  and why, one file per subsystem. Living docs, not append-only — edit a subsystem's file in
  place when that subsystem changes.
- **`docs/agent/log/`** (start at its `INDEX.md`) — one immutable file per work session or
  milestone, newest listed first. Add a new entry after any meaningful chunk of work (not every
  file edit) covering what shipped, why, and what the next session should watch out for. Never
  edit an old entry to add new information.
- **`docs/agent/bugs/`** (start at its `INDEX.md`) — in-repo bug tracker, one file per bug,
  created lazily. Log a bug when you find one, even if you fix it immediately; update its status
  rather than deleting the file.

`docs/ARCHITECTURE.md` holds the product/technical rationale and setup instructions and is aimed
more at the human than at an agent mid-task — read it for context, but keep the three doc trees
above up to date as you work.

## Experience Direction Invariants

When touching UI/UX, preserve the product intent: this should feel like opening memories, not
using software.

- Prioritize emotional pacing over feature density: each screen should have a clear beginning,
  buildup, reveal, and resolution.
- Default to guided progression over broad navigation: reduce simultaneous choices when possible.
- Avoid generic app patterns (dashboard grids, admin-like forms, utility-first empty states)
  unless functionally required.
- Keep interactions tactile and legible (unfold, lift, turn, reveal) and ensure reduced-motion
  users still get semantic pacing without abrupt jumps.
- Celebration Mode (5th) should feel like a distinct atmosphere shift, not only a color tweak.
- Do not break core invariants to achieve style: no duplicated business logic outside `lib/`, no
  auth/storage/data regressions, no silent behavior changes.
