# Codebase Map — Index

Table of contents only. Open just the row you need.

| Subsystem | File | Status |
|---|---|---|
| Project overview, stack, folder layout, invariants | [`overview.md`](overview.md) | current |
| Database schema, RLS, RPCs | [`data-model.md`](data-model.md) | current |
| Auth + route gating | [`auth.md`](auth.md) | current |
| The demo account (isolated via a separate Postgres schema) | [`demo.md`](demo.md) | current |
| Design tokens + theming | [`theming.md`](theming.md) | current |
| The painted world (ambient backdrop) | [`painted-world.md`](painted-world.md) | current |
| Experience direction + interaction choreography guardrails | [`experience-direction.md`](experience-direction.md) | current |
| Chapter album pages, image weight, signed URLs | [`reading-experience.md`](reading-experience.md) | current |
| Cinematic opening sequence engine | [`opening-sequence.md`](opening-sequence.md) | current |
| Celebration Mode (5th of month) | [`celebration-mode.md`](celebration-mode.md) | current |
| Living timeline + stats derivation | `timeline-stats.md` | not yet built |
| Time capsules (unlock filtering) | `time-capsules.md` | not yet built |
| Composer (photo upload) | covered in [`reading-experience.md`](reading-experience.md) | current |
| Composer (new *chapter*) | `composer.md` | not yet built |
| Bucket list (promises → memories) | [`bucket-list.md`](bucket-list.md) | current |
| Surprise engine | `surprises.md` | not yet built |
| Backup/export script | `backups.md` | not yet built |

When a "not yet built" row is implemented, replace the status with `current` and fill in the
file — don't leave stub files sitting around for systems that don't exist yet.
