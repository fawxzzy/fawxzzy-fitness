# 2026-11-26 - Applied migrations are append-only (Playbook rule on)

- WHAT changed: `playbook.config.json` switches on the Playbook verify rule `migrationsAppendOnly` for `supabase/migrations/**/*.sql`. A pull request may add migration files there; modifying, deleting or renaming an existing one fails `npm run verify` and the blocking CI job.
- WHY it changed: 23 of 134 migration files had been edited in place over the last year (2026-11-15 history mine). An edited migration no longer matches what the database already ran. Owner request 2026-11-26.
- Rule: never edit a migration that is on `main`; ship the correction as a new migration. The rule has no escape hatch, and it applies to a merged migration even if its SQL has not been applied yet.
- Evidence: local scratch test on this branch (a one-line edit to an existing migration makes verify fail with `migrationsAppendOnly`; adding a new file passes); this pull request's Playbook CI job.
- Status: source only; gate change, no app behavior change, no database change, no deploy needed.
