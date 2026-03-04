# Codex Guardrails

Codex must read and evaluate this file **before generating any patch** in this repository.

If a requested change would violate any guardrail below, Codex must refuse the change and return exactly:

```text
Guardrail violation
Rule: <rule name>
Reference: <playbook doc>
```

Codex must not proceed with code generation until the request is corrected to satisfy all applicable guardrails.

## Architecture Guardrails

### 1) Single scroll owner
- Rule: Pages must have only one vertical scroll container.
- Enforcement: Do not introduce nested vertical scroll owners for a screen surface.
- Reference: `Playbook/docs/GUARDRAILS/guardrails.md` ("Enforce a single scroll owner for bottom action compatibility").

### 2) Bottom actions ownership
- Rule: Only screen shells may mount `BottomActionsProvider` / `BottomActionsSlot`.
- Enforcement: Feature components may publish bottom actions but may not own provider/slot mounting.
- Reference: `Playbook/docs/GUARDRAILS/guardrails.md` ("Treat direct BottomActionBar mounting as framework-only").

### 3) Safe-area spacing ownership
- Rule: Safe-area spacing must be handled by `AppShell` tokens.
- Enforcement: Do not add ad hoc per-screen `env(safe-area-inset-*)` spacing contracts.
- Reference: `Playbook/docs/PATTERNS/mobile-interactions-and-navigation.md` ("AppShell owns mobile safe-area variables and offsets").

### 4) Loader-derived summaries
- Rule: Feed lists must derive summary view models server-side.
- Enforcement: Keep summary shaping in loaders/transformers; avoid recomputing list summary contracts in client renderers.
- Reference: `Playbook/docs/PATTERNS/server-client-boundaries.md` ("Build history feed cards from server-shaped session summaries").

### 5) Defensive ID validation
- Rule: Client surfaces must reject malformed UUID inputs.
- Enforcement: Validate IDs before opening UI/detail fetch flows and preserve API boundary validation.
- Reference: `Playbook/docs/GUARDRAILS/guardrails.md` ("Validate exercise IDs at client-open and API-entry boundaries").
