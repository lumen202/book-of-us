# Agent Framework — Start Here

Read this file first, then follow only the links relevant to your task. Nothing else in
`docs/agent/` should be read in full up front — each subsystem doc is small and self-contained
on purpose, so a session touching the opening sequence never has to load the timeline stats doc
to get oriented. Efficiency here is deliberate: this project is designed to accumulate history
for decades, and an agent re-reading the whole history every session would waste tokens and
increase the odds of drifting/hallucinating on stale details.

## Where to look

| Need | Go to |
|---|---|
| Orient on the project / stack / folder layout | [`codebase-map/INDEX.md`](codebase-map/INDEX.md) → `overview.md` |
| Understand a specific subsystem (schema, auth, theming, opening sequence, celebration mode, timeline, capsules, composer...) | [`codebase-map/INDEX.md`](codebase-map/INDEX.md) — find the row for that subsystem, open only that file |
| See what past sessions did and why, before starting new work | [`log/INDEX.md`](log/INDEX.md) — skim the table, open only entries relevant to your task |
| Check for known issues in an area before touching it | [`bugs/INDEX.md`](bugs/INDEX.md) |
| Product/design rationale, env setup, deployment | `docs/ARCHITECTURE.md` (repo root `docs/`, not this folder) |

## Rules for keeping this cheap to use

1. **One topic per file.** Never grow a single file into a catch-all history or map. If a doc
   file would need a new heading for an unrelated topic, it should be a new file instead.
2. **Indexes are tables, not prose.** Every `INDEX.md` in this tree is a short table (or list)
   so it can be read in one shot without loading the entries it points to.
3. **Log entries are immutable, one per session/milestone.** Never edit an old log entry to add
   new information — write a new entry and let it reference the old one (`see log/2026-07-26-...`)
   if relevant.
4. **Codebase-map files are living, not append-only.** Unlike the log, these describe *current*
   state — edit them in place when a subsystem changes, don't pile up outdated variants.
5. **Bug files are created lazily.** Don't pre-create placeholder bug files; `bugs/INDEX.md`
   starts (and may stay) empty.
