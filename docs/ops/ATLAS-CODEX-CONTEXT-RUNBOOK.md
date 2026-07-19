# Atlas Codex Context Runbook

## Purpose

This runbook keeps the Fitness metrics pack evidence-backed when Atlas or Codex
work needs the established Fitness integration context. It is a source contract,
not a production operation or a provider-data export.

## Canonical Evidence

Start from the frozen metrics pack at
`truth-pack/fitness/event-contract/atlas-fitness-wave-2-metrics-pack.v1.json`.
The pack is supported by these maintained sources:

- `docs/architecture/fitness-integration.md` for Fitness, Playbook, and Lifeline ownership.
- `docs/day-summary-taxonomy-glossary.md` for stable day-summary vocabulary.
- `src/lib/ecosystem/fitness-integration-contract.ts` for typed signals, snapshots, and receipts.
- `src/lib/ecosystem/fitness-shadow-events.ts` for shadow-mode lineage behavior.
- `src/lib/session-follow-up-jobs.ts` for session follow-up emission boundaries.
- `truth-pack/fitness/signals.json`, `state-snapshots.json`, and `actions-and-receipts.json` for frozen event evidence.
- `docs/registry/STACK-SYNERGY-REGISTRY.json` for stack-level ownership context.

## Verification

Before relying on the pack, run `npm run test:fitness-event-contracts`. The test
requires every declared evidence reference to remain present and checks that
pack nouns, correlation keys, denominators, funnels, and KPIs still match the
typed Fitness integration contract.

## Boundaries

- Fitness emits deterministic app facts and consumes typed receipts; it does not
  embed Atlas planning or Lifeline execution decisions.
- This evidence pack is source-only. It does not authorize provider access,
  production deployment, user-data inspection, or board mutation.
- A new metric, funnel stage, source field, or evidence location requires an
  intentional metrics-pack version update with corresponding contract coverage.
