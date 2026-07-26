# BUG-001: AGENTS.md pointed to deleted single-file docs after folder restructure

- **Found:** 2026-07-26
- **Where:** `AGENTS.md`
- **Symptom:** When `docs/agent/` was restructured from three flat files
  (`CODEBASE_MAP.md`/`AGENT_LOG.md`/`BUGS.md`) into per-topic folders with index files, the
  pointer section in `AGENTS.md` was not updated — it still told a fresh session to read
  `docs/agent/CODEBASE_MAP.md`, `docs/agent/AGENT_LOG.md`, `docs/agent/BUGS.md`, none of which
  exist anymore. A new session opening this repo cold would have hit a dead link at the very
  first step of orientation, defeating the entire point of the framework.
- **Status:** fixed (2026-07-26) — `AGENTS.md` now points to `docs/agent/INDEX.md` and describes
  the actual `codebase-map/`, `log/`, `bugs/` folder structure.
