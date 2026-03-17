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

## Sanity Check

Run before pushing major changes:

```bash
npm run sanity
```

This verifies lint and production build.
