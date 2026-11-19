# Fitness Discord Inventory and Noise Audits

## Purpose

`scripts/discord-server-inventory.mjs` reads the Fitness Discord server (roles, channels, emojis, forum tags) and renders a markdown and JSON snapshot, plus a noise audit of channels and roles that look redundant or noisy.

## Contract

- Outputs are review-only snapshots for human inspection. They are written to the paths resolved by `resolveInventoryOutputPaths`.
- The noise audit is recommendation-only in v1. Nothing is applied from it.
- The lane does not mutate Discord permissions, channels, or notification settings: it only issues GET requests through `discordRequest`.

## Tests

`scripts/discord-server-inventory.test.mjs` covers the snapshot rendering, the noise audit and this contract. It runs under `npm run test:all`.
