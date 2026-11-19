# Fitness Feedback Phase Readiness Reports

## Purpose

`scripts/check-feedback-phase-readiness.mjs` checks whether the feedback report that must come first (`--requires <id>`) is resolved and approved before the next report (`--report-id <id>`) starts. It is a local operator tool and needs the local Fitness Supabase and Discord environment; it is not run by hosted CI.

## Contract

- Reports are review-only snapshots for human inspection. They are written under `runtime/feedback-phase/` (`latest.md` plus a JSON artifact).
- The lane must not mutate Discord, Supabase rows, GitHub issues, or ATLAS receipts. It reads one `discord_feedback_reports` row per id and issues GET requests to Discord.
- A failing readiness result is still a valid report outcome: the artifacts are written for failing results too, and the failure reasons are listed in the markdown.

## Tests

`scripts/check-feedback-phase-readiness.test.mjs` covers argument parsing, the readiness rules, the rendered markdown, artifact writing and this contract. It runs under `npm run test:all`.
