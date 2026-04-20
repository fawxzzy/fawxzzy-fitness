# Fitness Design System

The Fitness design system is owned by the repo and published through `truth-pack/fitness/design-system/`.

Use this contract-first:

1. Freeze tokens in `tokens.v1.json`.
2. Freeze primitive contracts in `primitives.v1.json`.
3. Let app primitives consume those contracts through a narrow bridge.
4. Adopt the contracts on screens after the primitives are stable.

Intended invariants:

- Shared UI primitives consume tokens, not ad hoc values.
- Screen consistency should come from contract-backed primitives, not repeated screen-local fixes.
- Observation or validation layers should point at the owner truth here, not infer a second source of UI truth from live drift.

Migration intent:

- This pack is the foundation layer only.
- It is meant to stabilize the header, card, tag/badge, and section layout primitives before any broad visual refactor.
- Existing behavior should remain intact while the app switches to the frozen contract surface.
