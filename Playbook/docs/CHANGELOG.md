# Changelog

## 2026-03-02 — Added project governance contract entrypoint and guardrail catalog polish

### WHAT
- Added `docs/PROJECT_GOVERNANCE.md` as the canonical governance contract for downstream repositories and added a local `docs/PLAYBOOK_CHECKLIST.md` pointer to active workflow checklists.
- Updated governance discovery links in README/index/consumption docs to use the new governance entrypoint while preserving subtree guidance.
- Clarified empty guardrail index sections and reduced duplication in the guardrails catalog by adding a template section and removing redundant title metadata lines.
- Bumped governance patch version from `v0.3.2` to `v0.3.3`.

### WHY
- Reduce governance friction for consuming repositories by making scope, pinning expectations, and required local documents explicit in one operational contract.
- Improve guardrail discoverability and readability without changing guardrail meaning.
- Keep versioning and release notes aligned with documentation-only governance improvements.

[Back to Index](./INDEX.md)

## 2026-03-02 — Follow-up pattern specificity and mobile guidance restoration

### WHAT
- Replaced remaining generic top-section pattern text with file-specific operational Context, Solution, Tradeoffs, and Example content across `docs/PATTERNS/`.
- Restored detailed mobile guidance sections (route vs overlay usage, scroll ownership, sticky CTAs, modal portals, touch feedback, and navigation performance) while keeping guardrails centralized.
- Kept direct related-guardrail deep links in patterns and preserved layered taxonomy.
- Bumped governance version to `v0.3.2` as a PATCH clarification pass.

### WHY
- Ensure pattern docs remain actionable and high-signal for implementers, without reintroducing duplicated guardrail canon or structural drift.

## 2026-03-02 — PR review fixes for pattern signal restoration

### WHAT
- Replaced placeholder template text in pattern docs with concise operational Context, Solution, Tradeoffs, and Example guidance.
- Restored high-signal guidance in mobile interactions/navigation and media fallback patterns while keeping guardrails centralized in `docs/GUARDRAILS/guardrails.md`.
- Added direct related-guardrail deep links across touched patterns and rechecked internal path consistency after layer moves.
- Updated governance versioning with a patch bump to `v0.3.1`.

### WHY
- Preserve enforceability and layered governance structure without sacrificing practical implementation guidance in core pattern docs.

## 2026-03-02 — Structural governance hardening and version normalization

### WHAT
- Reorganized governance into explicit layers: `PRINCIPLES`, `PATTERNS`, `GUARDRAILS`, `WORKFLOWS`, `REFERENCE`, plus new `VERSIONING.md`.
- Added normalized guardrail catalog and enforcement index under `docs/GUARDRAILS/` using a strict invariant template.
- Added `docs/CONSUMPTION.md` to define downstream integration and sync safety.
- Updated `README.md` and `docs/INDEX.md` to make governance usage operational and version-aware.
- Moved principles and decisions into layered locations and merged duplicate frontend media fallback doctrine into the canonical media pattern/guardrail catalog.

### WHY
- Make governance enforceable, versioned, and scalable across multiple production repositories while reducing structure overlap and doctrine drift.

## 2026-03-02 — Added six proposed guardrails across CI, mobile interaction, auth boundaries, media sync, and shared detail rendering

### WHAT
- Expanded `docs/PATTERNS/ci-guardrails-and-verification-tiers.md` with a proposed API error metadata guardrail (`requestId` + `phase`).
- Expanded `docs/PATTERNS/mobile-interactions-and-navigation.md` with proposed guardrails for single scroll ownership per app shell and sticky CTA content padding offsets.
- Expanded `docs/PATTERNS/server-client-boundaries.md` with a proposed middleware-only token refresh ownership guardrail.
- Expanded `docs/PATTERNS/media-fallbacks.md` with a proposed deterministic sync-report guardrail that avoids default in-place auto-renaming.
- Expanded `docs/PATTERNS/ui-controller-separation.md` with a proposed canonical renderer + resolver guardrail for repeated detail surfaces.
- Updated `docs/PLAYBOOK_NOTES.md` to record matching local inbox entries for all six proposed guardrails.

### WHY
- Preserve and codify recurring reliability guardrails in canonical pattern docs with enforceable guidance so teams can reduce diagnosis time, avoid mobile layout regressions, keep auth refresh ownership deterministic, prevent hidden media mutations, and eliminate multi-flow detail drift.

## 2026-03-01 — Added proposed guardrails for deterministic media fallback, canonical catalog loading, and safe cache degradation

### WHAT
- Expanded `docs/PATTERNS/media-fallbacks.md` with a proposed guardrail that treats seeded placeholder defaults as unset in canonical fallback resolvers.
- Added `docs/PATTERNS/frontend/media-fallbacks.md` with a proposed frontend rendering guardrail that keeps media slots rendered and degrades inside image components.
- Expanded `docs/PATTERNS/deterministic-reversible-state.md` with a proposed shared-catalog-loader guardrail for Add Exercise and History browser surfaces, with explicit canonical-ID stats layering requirements.
- Expanded `docs/PATTERNS/cache-and-revalidation.md` with a proposed non-fatal degradation guardrail for optional derived cache tables when schema rollout lags.
- Updated `docs/INDEX.md` and `docs/PLAYBOOK_NOTES.md` to link and track the new proposed doctrine entries.

### WHY
- Encode deterministic, enforceable behavior that prevents placeholder truthiness regressions, cross-surface catalog drift, and avoidable route outages when optional cache schema is temporarily unavailable.

## 2026-03-01 — Added guardrail canon for deterministic IDs, bounded recompute, mobile destructive portals, and media manifest gating

### WHAT
- Expanded `docs/PATTERNS/deterministic-reversible-state.md` with new guardrails for canonical-ID cache lookups, shared measurement-to-goal payload mapping, bounded recompute after additive/destructive mutations, and risk-tiered destructive safeguards with deterministic undo eligibility.
- Expanded `docs/PATTERNS/mobile-interactions-and-navigation.md` with a body-level portal guardrail for destructive confirmations (full-viewport fixed backdrop + scroll lock).
- Added `docs/PATTERNS/media-fallbacks.md` to codify manifest-gated slug media lookup and deterministic placeholder fallback policy.
- Added corresponding 2026-02-28 local inbox notes in `docs/PLAYBOOK_NOTES.md` and linked the new media pattern from `docs/INDEX.md`.

### WHY
- Capture recurring 2026-02-27/28 silent-failure classes as reusable doctrine so implementation repos can prevent ID-domain drift, payload mapping divergence, stale derived stats after deletes/edits, mobile overlay clipping, unsafe undo affordances, and repeated missing-media network churn.

## 2026-02-27 — Added media-fallback guardrail candidate to local inbox

### WHAT
- Appended a new Playbook Notes entry proposing a session-scoped cache for known-missing media URLs in shared image components, including rationale, evidence paths, and suggested canonical destination.

### WHY
- Capture this frontend reliability guardrail in the local doctrine inbox so it can be reviewed and upstreamed into canonical media fallback guidance without losing context.

## 2026-02-27 — Upstreamed local inbox notes into canonical pattern docs

### WHAT
- Added `docs/PATTERNS/mobile-interactions-and-navigation.md` to consolidate reusable mobile interaction, list-shell, history-audit, action-feedback, and navigation-performance guardrails.
- Added `docs/PATTERNS/theming-dark-mode.md` for dark-theme surface/token/glass guardrails and merged-branch visual verification guidance.
- Expanded existing patterns (`server-client-boundaries`, `offline-first-sync`, `resilient-client-state`, `versioned-persistence`, `timezone-determinism`) with actionable sections derived from proposed local notes, including Problem → Guideline → Example → Pitfalls where applicable.
- Updated `docs/INDEX.md` to link new pattern docs.

### WHY
- Convert project-local lessons into reusable central doctrine with minimal, actionable guidance and stronger cross-links between offline sync, idempotency, server action contracts, and timezone determinism.

## 2026-02-22 — Governance + Resilience Doctrine Patch

### WHAT
- Added Canonical Governance Contract doctrine.
- Added Single Identity Authority doctrine.
- Formalized Verification Tier model (Static, Build, Contract).
- Added Orchestration Density Control pattern.
- Added Resilient Client-State & Idempotent Sync pattern.
- Strengthened Auth & Release checklists.

### WHY
- Audits across adopting repositories revealed governance ambiguity, auth authority drift, orchestration density risk, and verification expectations that were not codified as enforceable tiers; these changes formalize contract integrity and reduce systemic drift.

## 2026-02-20 — Initial Playbook Repository Bootstrap

### WHAT
- Created the playbook structure with root README and central docs index.
- Added core docs: principles, decisions, and changelog.
- Added raw source dump placeholders under `docs/PROJECT_DUMPS/`.
- Added initial reusable pattern docs, checklists, templates, and Codex prompts.

### WHY
- Establish a maintainable, navigable baseline for long-term product engineering guidance.
- Separate source material from distilled operational guidance.
- Enable faster project startup, safer risky changes, and consistent release preparation.
- Prepare the repo for incremental, tiny-PR evolution as new lessons emerge.

## 2026-02-20 — Ingested dual playbook dumps and distilled reusable doctrine

### WHAT
- Added canonical raw dump files for Dump A and Dump B under `docs/PROJECT_DUMPS/`.
- Replaced provisional principles/decisions with source-grounded, cross-dump doctrine and decision heuristics.
- Expanded pattern library with boundary, determinism, persistence, offline, auth/RLS, CI guardrail, timezone, and caching guidance.
- Updated checklists to map each item to principle/pattern intent with dump-section sources.
- Updated prompt library (including governance header and new security/RLS review prompt) and aligned templates with verification + WHAT/WHY expectations.
- Refreshed `docs/INDEX.md` to link all updated artifacts and defined three usage workflows.

### WHY
- Centralize cross-project lessons into reusable, evidence-backed engineering doctrine.
- Reduce startup and decision friction for future projects by providing modular, source-attributed guidance.
- Improve consistency of risky-change execution (schema/auth/offline/release) through stronger patterns, checklists, and prompt governance.

## 2026-02-25 — Added local playbook-notes inbox for upstream candidate guidance

### WHAT
- Added `docs/PLAYBOOK_NOTES.md` as a structured local inbox for proposed guardrails/patterns/decisions captured from implementation work.
- Linked Playbook Notes from `docs/INDEX.md` for discoverability.

### WHY
- Preserve candidate doctrine in one auditable place before promotion into canonical playbook patterns/decisions, reducing loss of field learnings and easing periodic distillation.
