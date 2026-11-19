# Fitness Discord Feedback Exports

## Purpose

`scripts/export-discord-bug-reports.mjs` exports rows of `discord_feedback_reports` into local markdown and JSON files so an operator can review bug reports outside Discord.

## Contract

- Exports are review-only snapshots for human inspection.
- Discord ids must stay masked: reporter ids are written as `reporter_discord_user_id_masked` (see `maskDiscordUserId`) unless the operator passes the explicit debug flag for a local-only run.
- Do not use this lane to create forum threads, change report state, create GitHub issues, or write directly into ATLAS receipts. It only selects rows and writes local files.

## Tests

`scripts/export-discord-bug-reports.test.mjs` covers argument parsing, masking, rendering and this contract. It runs under `npm run test:all`.
