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

### 6) AppShell owns safe-area insets and fixed-bar reserves
- Rule: Only the AppShell/page shell may apply safe-area inset padding/margins and fixed-bar reserve spacing.
- Enforcement: Screens/components must not introduce `env(safe-area-inset-*)` usage or ad-hoc padding/margins intended to compensate for nav/header/footer overlap.
- Enforcement: Bottom action bars must be published into the screen-owned slot/provider pattern, not mounted ad-hoc inside scrollers or glass/overflow contexts.
- Violation examples to flag:
  - `env(safe-area-inset-top)`
  - `env(safe-area-inset-bottom)`
  - `safe-area-inset`
  - ad-hoc `pb-*` / `pt-*` added "to avoid overlap"
- Reference: `Playbook/docs/PATTERNS/mobile-interactions-and-navigation.md` and `Playbook/docs/GUARDRAILS/guardrails.md`.


## Playbook Status Guardrails

### 7) Read Playbook status first
- Rule: Read `docs/playbook-status.json` before making changes so implementation decisions use current Playbook state.
- Enforcement: Do not start patch work until status snapshot fields are reviewed.
- Reference: `docs/playbook-status.json`.

### 8) Resolve failing contracts before shipping
- Rule: If `contracts.status == FAIL` (or `contracts.summary.fail > 0`) in `docs/playbook-status.json`, contract violations must be fixed before starting unrelated new work.
- Enforcement: Treat contract FAIL state as release-blocking for patch delivery until violations are resolved, including unrelated work.
- Reference: `docs/playbook-status.json` (`contracts.status`, `contracts.summary.fail`).

### 9) Follow Playbook recommended next action
- Rule: When `recommendation.nextCommand` is present in `docs/playbook-status.json`, follow that command in the workflow.
- Enforcement: If you intentionally do not follow it, explicitly document why in your delivery summary.
- Reference: `docs/playbook-status.json` (`recommendation.nextCommand`).


### 10) Verify before finalization
- Rule: Agents must run verification before finalizing work.
- Enforcement: Run `npm run verify` when available; otherwise run the repository verification set (`npm run lint` and `npm run build`) and report results.
- Reference: `docs/PROJECT_GOVERNANCE.md` quality gate.

## Playbook Draft Automation

### 11) Signals-prefilled drafts are authoritative
- Rule: Diff-generated Playbook draft notes must use the Signals Engine auto-classification fields (`Type`, `Suggested Playbook File`, `Evidence`) when available.
- Enforcement: Do not hand-wave or leave these fields blank in generated draft flows; preserve deterministic signal output.
- Reference: `scripts/playbook/signals-from-diff.mjs`.

### 12) Duplicate draft suppression + near-duplicate operator feedback
- Rule: Treat dedupe signals with two outcomes: `kind: "duplicate"` must skip draft creation, while `kind: "near-duplicate"` must keep draft creation but annotate it with a possible-duplicate line for reviewer context.
- Enforcement: Duplicate skips are informational success paths (not failures); near-duplicates should recommend refining/splitting scope when creating new doctrine and linking existing doctrine when overlap is direct.
- Recommended action: Link or extend existing doctrine for hard duplicates; refine wording/scope and keep explicit cross-links for near-duplicates.
- Reference: `scripts/playbook/signals-from-diff.mjs`, `scripts/playbook/suggest-notes-from-diff.mjs`, `scripts/playbook/guardian-generate-notes.mjs`.
