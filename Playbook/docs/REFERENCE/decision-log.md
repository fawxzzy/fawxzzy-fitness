# Decisions

[Back to Index](../INDEX.md)

This file records durable, playbook-level decisions inferred from source dumps.

## D-0001: Keep source dumps raw and separate from distilled doctrine
- **What:** Store source-of-truth exports in `docs/PROJECT_DUMPS/` and keep reusable guidance in principles/patterns/checklists/prompts.
- **Why:** Preserves provenance while allowing concise, reusable distillation.
- **Tradeoffs:** Requires discipline to maintain references and avoid drift.
- **Source:** Dump A — `7) Reusable Assets`; Dump B — `Documentation & Workflow Discipline`.

## D-0002: Prefer modular-monolith seams with explicit boundaries
- **What:** Organize feature areas as bounded modules with explicit entry points and shared-layer contracts.
- **Why:** Improves maintainability without forcing early distributed-systems complexity.
- **Tradeoffs:** Boundary governance adds upfront design overhead.
- **Source:** Dump B — `Core Principles / Modular monolith with strict seams`, `Architectural Patterns / Layered module composition`; Dump A — `2) Core Principles / strict server/client boundaries`.

## D-0003: Treat deterministic and reversible state as a quality bar
- **What:** Critical state transitions must be explicit, serializable, and explainable.
- **Why:** Supports debugging, recovery, auditability, and user trust.
- **Tradeoffs:** Extra modeling effort vs quick ad-hoc mutation logic.
- **Source:** Dump A — `2) Core Principles / deterministic and explainable`; Dump B — `Core Principles / Deterministic, reversible state changes`.

## D-0004: Make persistence evolution versioned and migration-aware
- **What:** Persisted contracts are versioned; changes include migration/compatibility thinking.
- **Why:** Data lifetime exceeds release lifetime.
- **Tradeoffs:** Additional compatibility code and migration documentation.
- **Source:** Dump A — `4) Data Modeling & Storage / ordered SQL migrations`; Dump B — `Core Principles / Versioned persistence as a contract`, `Data Modeling Patterns / Version-tagged snapshot schema`.

## D-0005: Enforce authorization at backend/data-policy layers, not only UI
- **What:** Use server-side authorization and row-level policies as authority; UI guards are for navigation/UX only.
- **Why:** Prevents client-bypass privilege leaks.
- **Tradeoffs:** More backend policy work and test coverage needs.
- **Source:** Dump A — `5) Auth & Security / RLS assumptions and enforcement`; Dump B — `Auth & Security Patterns / RLS pattern status`, `Lessons Learned / local role guards only for UX shaping`.

## D-0006: Separate orchestration/policy from execution units
- **What:** Keep coordinator/orchestrator logic distinct from transaction execution services.
- **Why:** Avoids god-services and improves extension safety.
- **Tradeoffs:** More moving parts and interface design work.
- **Source:** Dump B — `Architectural Patterns / Policy/coordination split`; Dump A — `3) Architectural Patterns / route-local server actions`.

## D-0007: Standardize verification and changelog discipline
- **What:** Require verification tiers, explicit validation notes, and changelog entries in WHAT + WHY format.
- **Why:** Makes behavioral intent and quality gates durable across team changes.
- **Tradeoffs:** Slightly slower PR throughput for tiny edits.
- **Source:** Dump A — `6) Workflow Discipline / scripts and checks, changelog discipline`; Dump B — `Documentation & Workflow Discipline / verification tiers, CI guard script, changelog discipline`.

## Decision Heuristics

### Prefer simplicity when:
- The workflow is single-step with no branching/retry/fallback requirements.
- Additional abstraction is speculative and not yet justified by multiple callers.
- The change can remain explicit without violating boundary/security principles.

### Prefer abstraction when:
- Multiple runtime modes/providers need interchangeable behavior.
- Policy selection and transaction execution are diverging responsibilities.
- Persistence formats/schemas will evolve and require backward compatibility.
- Verification and rollout risk need reusable, repeatable guardrails.

**Heuristic Source:** Dump A — `3) Architectural Patterns / when to use route-local actions`; Dump B — `Architectural Patterns / dependency inversion, policy-coordination split`, `Lessons Learned / coordinator classes, provider interfaces stable`.

## TODO Decisions (evidence shows need, but decision not finalized)
- **TODO-D1: CI contract scope.** Choose mandatory checks and docs-only bypass policy details. Source: Dump A `8) Gaps / Define and enforce CI workflow`; Dump B `Documentation & Workflow Discipline / CI guard script`.
- **TODO-D2: Migration rollout contract.** Define code-vs-schema sequencing and rollback expectations. Source: Dump A `8) Gaps / migration rollout policy`.
- **TODO-D3: Environment contract artifact.** Decide canonical env var reference format. Source: Dump A `8) Gaps / environment contract document`.
- **TODO-D4: Input validation standardization.** Decide minimal local validation vs centralized schema validation for critical mutations. Source: Dump A `8) Gaps / API-level input schema validation`.
