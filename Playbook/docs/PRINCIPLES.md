# Principles

[Back to Index](./INDEX.md)

## 1) Optimize for clarity and delivery speed before sophistication.
- **Why it matters:**
  - Fast iteration keeps feedback loops short.
  - Simpler designs reduce accidental complexity and review overhead.
- **How to apply:**
  - Ship smallest viable behavior first, then iterate.
  - Prefer direct implementations over speculative abstractions.
  - Keep docs and code paths readable for new contributors.
- **Source:** Dump A — `2) Core Principles / Build for speed and clarity first`; Dump B — `Core Principles / Architecture-first decision making`.

## 2) Keep business behavior deterministic and explainable.
- **Why it matters:**
  - Predictable outcomes improve trust and debuggability.
  - Determinism is a prerequisite for safe replay, auditing, and recovery.
- **How to apply:**
  - Make decision inputs/outputs explicit.
  - Avoid hidden heuristics in critical flows.
  - Encode state changes as explicit, serializable transitions.
- **Source:** Dump A — `2) Core Principles / Keep progression deterministic and explainable`; Dump B — `Core Principles / Deterministic, reversible state changes`.

## 3) Enforce strict execution boundaries (server/client, UI/controller, module seams).
- **Why it matters:**
  - Boundary violations cause security/runtime defects.
  - Stable seams make refactors safer and more incremental.
- **How to apply:**
  - Keep server-only and client-only code isolated.
  - Keep presentation components distinct from coordination logic.
  - Expose feature capabilities through explicit module entry points.
- **Source:** Dump A — `2) Core Principles / Enforce strict server/client boundaries`; Dump B — `Architectural Patterns / Layered module composition`, `UI/controller separation pattern`.

## 4) Make ownership and access control authoritative at the data boundary.
- **Why it matters:**
  - UX-level checks are insufficient for data protection.
  - Explicit ownership prevents cross-account leakage.
- **How to apply:**
  - Model row ownership explicitly (for example via owner identifiers).
  - Enforce row-level policy server-side/database-side.
  - Treat client role guards as UX hints, not security authority.
- **Source:** Dump A — `2) Core Principles / Treat user ownership + RLS as mandatory`, `5) Auth & Security / RLS assumptions`; Dump B — `Auth & Security Patterns / RLS pattern status`, `Lessons Learned / local role guards only for UX shaping`.

## 5) Treat persistence formats and schemas as versioned contracts.
- **Why it matters:**
  - Persisted data outlives any single release.
  - Versioning enables safe backward compatibility and migrations.
- **How to apply:**
  - Include explicit version tags in persisted representations.
  - Plan migration/compatibility work with each format change.
  - Keep migration intent, ordering, and validation explicit.
- **Source:** Dump A — `4) Data Modeling & Storage / schema evolved via ordered migrations`; Dump B — `Core Principles / Versioned persistence as a contract`, `Data Modeling Patterns / Version-tagged snapshot schema`.

## 6) Prefer additive, reversible rollout strategies for risky changes.
- **Why it matters:**
  - Partial deploys and schema drift are common in production.
  - Reversible steps reduce blast radius.
- **How to apply:**
  - Sequence deploys to tolerate mixed-version windows.
  - Add fallback behavior where dependency rollout can lag.
  - Pair changes with rollback posture and verification checks.
- **Source:** Dump A — `2) Core Principles / resilient fallbacks during schema rollout risk`, `8) Gaps / migration rollout policy TODO`; Dump B — `Lessons Learned / fallback semantics intentionally`, `Documentation & Workflow Discipline / verification tiers`.

## 7) Separate policy decisions from transaction execution.
- **Why it matters:**
  - Mixing selection policy and execution logic creates fragile god-services.
  - Separation improves testability and extension safety.
- **How to apply:**
  - Put mode/provider selection in coordinator/orchestrator units.
  - Keep execution services focused on transaction steps.
  - Track active session/context independently from operation handlers.
- **Source:** Dump B — `Architectural Patterns / Policy-Coordination split`; Dump A — `3) Architectural Patterns / route-local mutation + revalidation`.

## 8) Use provider adapters and capability checks to absorb infrastructure variability.
- **Why it matters:**
  - Runtime/provider availability can vary by environment.
  - Adapter seams prevent provider details from leaking into core logic.
- **How to apply:**
  - Define stable provider interfaces.
  - Resolve active providers dynamically with explicit fallback reasons.
  - Normalize persisted metadata needed to track provider/location.
- **Source:** Dump B — `Architectural Patterns / Dependency inversion for providers`, `Offline & Sync Patterns / capability-based provider selection`; Dump A — `4) Data Modeling & Storage / supabase client factories`.

## 9) Engineer for temporal correctness explicitly.
- **Why it matters:**
  - Timezone/day-boundary drift causes subtle user-visible correctness bugs.
  - Time bugs are hard to diagnose after the fact.
- **How to apply:**
  - Resolve day windows in user-local timezone using shared helpers.
  - Keep day-index calculations centralized and deterministic.
  - Validate date-window logic where daily behavior matters.
- **Source:** Dump A — `2) Core Principles / timezone-aware routine resolution deterministic`, `3) Architectural Patterns / Timezone-safe day-window and day-index helpers`.

## 10) Keep caching and revalidation explicit and aligned with mutation boundaries.
- **Why it matters:**
  - Cached data without coherent invalidation causes stale behavior.
  - Explicit invalidation supports predictable UX after writes.
- **How to apply:**
  - Document cache ownership and invalidation triggers.
  - Revalidate path/tag immediately after relevant mutations.
  - Prefer deterministic cache keys and invalidation scopes.
- **Source:** Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`, `4) Data Modeling & Storage / server-side caching used for exercise catalog`.

## 11) Codify workflow discipline in automation and templates.
- **Why it matters:**
  - Process quality decays if it relies only on memory.
  - Standardized PR/check scripts improve consistency across contributors.
- **How to apply:**
  - Define verification tiers and required checks.
  - Enforce changelog and testing expectations in templates/CI guards.
  - Keep docs-only vs behavior-change rules explicit.
- **Source:** Dump A — `6) Workflow Discipline / build + lint + manual flow test`; Dump B — `Documentation & Workflow Discipline / verification tiers, CI guard script, PR template standardization`.

## 12) Preserve consistent user-facing terminology.
- **Why it matters:**
  - Vocabulary drift increases cognitive load.
  - Consistency improves navigation and onboarding.
- **How to apply:**
  - Reuse canonical terms across screens and docs.
  - Introduce alternate terminology only as explicitly labeled examples.
  - Review copy changes for term consistency before release.
- **Source:** Dump A — `2) Core Principles / Keep copy and domain language consistent`.

## 13) Canonical Governance Contract
- **Why it matters:**
  - Ambiguous authority causes CI/doc/agent drift across adopting repositories.
  - A single declared governance root keeps enforcement and documentation aligned.
- **How to apply:**
  - Declare one governance root per adopting repository.
  - Maintain a normative document list that CI and review workflows can validate.
  - Explicitly declare whether a vendored Playbook is **Normative** or **Reference** for that repository.
  - Use this required Governance Scope Declaration block verbatim:

```md
This repository governs: [product/domain]
Normative documents:
  - docs/PROJECT_GOVERNANCE.md
  - docs/ARCHITECTURE.md
  - docs/CHANGELOG.md
Playbook status: Normative | Reference
```

- **Source:** Cross-repository governance audits — authority ambiguity and CI/doc/agent drift findings (2026-02 doctrine patch request).

## 14) Single Identity Authority
- **Why it matters:**
  - Parallel identity authorities create auth ambiguity and inconsistent authorization decisions.
  - RLS correctness depends on one canonical identity model.
- **How to apply:**
  - Declare exactly one canonical identity/authz authority.
  - Ensure RLS policies and ownership checks align with that canonical authority.
  - If multiple auth mechanisms exist, mark non-canonical mechanisms as transitional/deprecated and document a migration path.
  - Validate policy alignment with [CI Guardrails and Verification Tiers](./PATTERNS/ci-guardrails-and-verification-tiers.md) contract gates.
- **Source:** Cross-repository auth drift audits — mixed authority and migration-gap findings (2026-02 doctrine patch request).
