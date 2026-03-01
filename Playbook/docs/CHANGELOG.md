# Changelog

[Back to Index](./INDEX.md)

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
