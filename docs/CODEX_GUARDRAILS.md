# Codex Guardrails

Codex must read and evaluate this file **before generating any patch** in this repository.

If a requested change would violate any guardrail below, Codex must refuse the change and return exactly:

```text
Guardrail violation
Rule: <rule name>
Reference: <local doc>
```

## Architecture Guardrails

### 1) Single scroll owner
- Rule: Pages must have only one vertical scroll container.
- Enforcement: Do not introduce nested vertical scroll owners for a screen surface.
- Reference: `docs/ARCHITECTURE.md`.

### 2) Bottom actions ownership
- Rule: Only screen shells may mount `BottomActionsProvider` / `BottomActionsSlot`.
- Enforcement: Feature components may publish bottom actions but may not own provider/slot mounting.
- Reference: `docs/ARCHITECTURE.md`.

### 3) Safe-area spacing ownership
- Rule: Safe-area spacing must be handled by `AppShell` tokens.
- Enforcement: Do not add ad hoc per-screen `env(safe-area-inset-*)` spacing contracts.
- Reference: `docs/ARCHITECTURE.md`.

### 4) Verify before finalization
- Rule: Agents must run verification before finalizing work.
- Enforcement: Run `npm run verify` when available; otherwise run `npm run lint` and `npm run build`.
- Reference: `docs/PROJECT_GOVERNANCE.md`.

### 5) Govern mutating prompts with explicit criteria
- Rule: Mutating Codex tasks are not governed unless they declare `Acceptance Criteria`, `Expected Changed Paths`, `Expected Unchanged Paths`, and `Blocked / Skipped Reporting Rules`.
- Enforcement: If a mutating prompt lacks that contract, do not treat it as governed completion authority.
- Reference: `docs/ops/FITNESS-COMPOUNDING-LANES-2026-05.md`.

### 6) Summary text is not proof
- Rule: Summary text cannot stand in for diff-proof or verification-proof.
- Enforcement: Do not claim completion for a mutating task unless each requested criterion is supportable from the final diff and verification output. Report blocked/skipped/failed criteria explicitly.
- Reference: `docs/ops/FITNESS-FEEDBACK-REVIEWED-TASKS.md`.

### 7) UI edit batches require explicit checklist reconciliation
- Rule: Explicit user edit lists must be reconciled item-by-item before completion is claimed.
- Enforcement: Convert the request into a checklist before mutating code and report each item as landed, blocked, or deferred from code plus proof, not memory.
- Reference: `docs/ops/FITNESS-LLEL-CHECKLIST.md`.

### 8) Screen-family normalization must start from the canonical surface
- Rule: When a request implies shared behavior or styling across sibling screens, patch the canonical shared surface first unless a documented intentional exception exists.
- Enforcement: Do not fix each sibling card or screen independently if a shared presentation or source component exists.
- Reference: `docs/PLAYBOOK_NOTES.md`.

### 9) Live user data is not disposable QA state
- Rule: Visual QA and debugging should prefer the Codex QA account, fixture lanes, or dev routes before touching live user-owned data.
- Enforcement: If live user data must be touched, keep the mutation bounded and restore or explicitly report resulting state before completion.
- Reference: `docs/ops/FITNESS-LLEL-CHECKLIST.md`.

## Sanity Check

Run before pushing major changes:

```bash
npm run sanity
```

This verifies the targeted mobile-regression parity guard, lint, and production build.
