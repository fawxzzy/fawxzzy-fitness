# Playbook Index

> Central table of contents for this repository.

## Core
- [Principles](./PRINCIPLES.md)
- [Decisions](./DECISIONS.md)
- [Changelog](./CHANGELOG.md)
- [Playbook Notes (Local Inbox)](./PLAYBOOK_NOTES.md)
- [Agent Contract](./AGENT.md)
- [Repo Contract](../CODEX.md)

## Patterns
- [Modular Monolith Seams](./PATTERNS/modular-monolith-seams.md)
- [Deterministic, Reversible State](./PATTERNS/deterministic-reversible-state.md)
- [Versioned Persistence](./PATTERNS/versioned-persistence.md)
- [Orchestration vs Execution](./PATTERNS/orchestration-vs-execution.md)
- [Orchestration Density Control](./PATTERNS/orchestration-density-control.md)
- [Provider Adapters](./PATTERNS/provider-adapters.md)
- [Offline-First Sync](./PATTERNS/offline-first-sync.md)
- [Resilient Client-State & Idempotent Sync](./PATTERNS/resilient-client-state.md)
- [Supabase Auth + RLS](./PATTERNS/supabase-auth-rls.md)
- [CI Guardrails and Verification Tiers](./PATTERNS/ci-guardrails-and-verification-tiers.md)
- [UI/Controller Separation](./PATTERNS/ui-controller-separation.md)
- [Server/Client Boundaries](./PATTERNS/server-client-boundaries.md)
- [Timezone Determinism](./PATTERNS/timezone-determinism.md)
- [Mobile Interactions, List Shells, and Navigation Performance](./PATTERNS/mobile-interactions-and-navigation.md)
- [Theming and Dark-Mode Guardrails](./PATTERNS/theming-dark-mode.md)
- [Cache and Revalidation](./PATTERNS/cache-and-revalidation.md)

## Checklists
- [PR Quality Checklist](./CHECKLISTS/pr-quality-checklist.md)
- [Schema Change Checklist](./CHECKLISTS/schema-change-checklist.md)
- [Auth + Security Checklist](./CHECKLISTS/auth-security-checklist.md)
- [Offline-First Checklist](./CHECKLISTS/offline-first-checklist.md)
- [Release Checklist](./CHECKLISTS/release-checklist.md)

## Templates
- [ADR Template](./TEMPLATES/ADR_TEMPLATE.md)
- [Architecture Template](./TEMPLATES/ARCHITECTURE_TEMPLATE.md)
- [Roadmap Template](./TEMPLATES/ROADMAP_TEMPLATE.md)
- [Contributing Template](./TEMPLATES/CONTRIBUTING_TEMPLATE.md)
- [Changelog Template (WHAT + WHY)](./TEMPLATES/CHANGELOG_TEMPLATE.md)
- [PR Template](./TEMPLATES/PR_TEMPLATE.md)

## Prompts
- [Governance Header Snippet](./PROMPTS/_GOVERNANCE_HEADER.md)
- [Codex New Project Bootstrap](./PROMPTS/codex-new-project-bootstrap.md)
- [Codex Architecture Review](./PROMPTS/codex-architecture-review.md)
- [Codex Schema Migration Review](./PROMPTS/codex-schema-migration-review.md)
- [Codex Offline Sync Review](./PROMPTS/codex-offline-sync-review.md)
- [Codex Security + RLS Review](./PROMPTS/codex-security-rls-review.md)

## Source Dumps
- [Fawxzzy Fitness Playbook Export (raw)](./PROJECT_DUMPS/FAWXZZY_FITNESS_PLAYBOOK_EXPORT.md)
- [NAT1 Engineering Playbook Export (raw)](./PROJECT_DUMPS/NAT1_ENGINEERING_PLAYBOOK_EXPORT.md)

## How to use this repo

### 1) Bootstrap a new project
1. Ensure `docs/AGENT.md`, `CODEX.md`, and `docs/CHANGELOG.md` exist (create from templates/contracts if missing).
2. Run [`codex-new-project-bootstrap`](./PROMPTS/codex-new-project-bootstrap.md).
3. Seed architecture from relevant patterns and record initial decisions.

### 2) Make a risky change (schema/auth/offline)
1. Run the matching checklist(s) in [`docs/CHECKLISTS`](./CHECKLISTS/).
2. Run corresponding review prompt(s) in [`docs/PROMPTS`](./PROMPTS/).
3. Capture tradeoffs in [`docs/DECISIONS.md`](./DECISIONS.md) and update [`docs/CHANGELOG.md`](./CHANGELOG.md) with WHAT + WHY.

### 3) Prepare a release
1. Complete [`release-checklist.md`](./CHECKLISTS/release-checklist.md).
2. Verify changelog has release-relevant WHAT + WHY entries.
3. Record unresolved evidence gaps as TODO decisions for follow-up.
