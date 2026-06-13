# Fitness DiscordOS Authenticated Live Transfer Handoff - 2026-06-12

## Decision

Fitness now sends DiscordOS feedback transfer payloads with an authenticated transfer secret after the Discord interaction request has already passed signature verification.

This preserves the real Discord-signed origin boundary while allowing DiscordOS to distinguish authenticated live transfer rows from proof-only automation rows.

## Owner Commits

Commits:

- `8e05d300 Require DiscordOS feedback transfer secret`
- `4f413d8d Refine logged session progression tags`

Relevant changed surfaces:

- `src/lib/discord/discordos-feedback-transfer.ts`
- `src/app/api/discord/interactions/route.ts`
- `src/lib/discord/discordos-feedback-transfer.test.ts`
- `src/lib/discord/interactions-route.test.ts`
- `src/components/ExerciseProgressionActivityPanel.tsx`

## Runtime Contract

In `DISCORDOS_FEEDBACK_TRANSFER_MODE=discordos-primary`:

- `DISCORDOS_FEEDBACK_TRANSFER_ENDPOINT_URL` is required
- `DISCORDOS_FEEDBACK_TRANSFER_SECRET` is required
- Fitness includes `X-DiscordOS-Feedback-Transfer-Secret` on the DiscordOS transfer request
- the transfer payload includes:
  - `transferSource: fitness-discord-interaction`
  - `sourceProof: discord-signature-verified-by-fitness`

The transfer call remains inside the Discord interactions route after the Ed25519 request signature check.

## Secret Handling

`DISCORDOS_FEEDBACK_TRANSFER_SECRET` was provisioned in Fitness Vercel production without printing or committing the value.

## Verification

Passed locally:

- `npm run typecheck`
- `node --import ./scripts/register-test-aliases.mjs --test src/lib/discord/discordos-feedback-transfer.test.ts src/lib/discord/interactions-route.test.ts`
- `npm run build`

The local build stopped three repo-local Next dev processes before building.

The build completed successfully with the existing React hook dependency warnings only.

## Deployment Proof

Vercel production deployed:

- project: `fawxzzy-fitness`
- deployment URL: `https://fawxzzy-fitness-ornettp9k-fawxzzy.vercel.app`
- production alias: `https://fawxzzy-fitness-local.vercel.app`

Vercel build completed successfully.

## Remaining Blocker

This does not itself create a live DiscordOS row.

The exact remaining blocker is:

`one real Discord-signed Fitness-origin feedback interaction that creates a human non-proof DiscordOS transfer row, followed by live traffic and live workflow parity proof ID capture`
