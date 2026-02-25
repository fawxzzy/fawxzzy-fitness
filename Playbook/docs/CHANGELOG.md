# Changelog

[Back to Index](./INDEX.md)

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

