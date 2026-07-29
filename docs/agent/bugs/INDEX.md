# Bug Tracker — Index

Deliberately in-repo instead of GitHub Issues, so it stays greppable by agents and travels with
the code. One file per bug, created lazily — don't pre-create placeholders.

| ID | Title | Status | File |
|---|---|---|---|
| BUG-001 | AGENTS.md pointed to deleted single-file docs after folder restructure | fixed | [`BUG-001-agents-md-stale-doc-links.md`](BUG-001-agents-md-stale-doc-links.md) |
| BUG-002 | root middleware.ts used deprecated Next.js 16 convention | fixed | [`BUG-002-middleware-renamed-to-proxy.md`](BUG-002-middleware-renamed-to-proxy.md) |
| BUG-003 | Unpainted strip at screen bottom while scrolling on Android | fixed | [`BUG-003-android-toolbar-uncovered-strip.md`](BUG-003-android-toolbar-uncovered-strip.md) |
| BUG-004 | Desktop inline nav reads as utility chrome, not part of the experience | open | [`BUG-004-desktop-nav-reads-as-utility-chrome.md`](BUG-004-desktop-nav-reads-as-utility-chrome.md) |

**To file a bug:** create `BUG-NNN-short-slug.md` in this folder (sequential ID, never reused,
even for invalidated bugs) with:

```
# BUG-NNN: Short title
- **Found:** YYYY-MM-DD
- **Where:** file/path or feature area
- **Symptom:** what goes wrong, concretely (inputs -> bad output)
- **Status:** open | fixed (YYYY-MM-DD) — one-line resolution if fixed
```

Then add a row to the table above. Never delete a bug file after fixing — update its `Status`
line and leave it as a record.
