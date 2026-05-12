# Fitness Roadmap

## Current Release Posture

- PR #16 remains frozen, open, and draft.
- No deploy should run from this lane.
- `release:fitness:record` must remain untouched.
- Manual review is paused until the next progression-core batch lands.

## Progression Core Correction

The next architectural correction is separating:

- promotion uses: what measurements prove readiness
- target changes: what target values mutate after readiness

Rule:

```text
Do not overload promotionBasis with mutation behavior.
```

Progression remains one deterministic layered engine. Linear, undulating, and conjugate variants should not be implemented as separate engines.

## Next Implementation Sequence

1. Prompt 11: progression layer spec update
2. Prompt 12: target mutation foundation
3. Prompt 13: qualification window foundation
4. Prompt 14: compact editor UI for target mutation and required successful sessions
5. Prompt 15: manual review checklist re-layout

## Stable Core In Scope

- target mutation foundation
- `increase_load_and_reps`
- qualification window / multiple successful sessions
- compact editor controls
- checklist refresh

## Future Roadmap Lanes

These remain docs-only for now:

- effort schedule / wave modifier runtime
- effort schedule / wave modifier UI
- focus rotation / conjugate modifier runtime
- focus rotation / conjugate modifier UI
- capability anchors onboarding and configuration

## Design Rules For Future Layers

- Baseline targets stay canonical.
- Modifiers compute effective targets instead of mutating stored routine targets.
- Focus rotation changes context, not engine identity.
- Speed or power claims require measured speed/power data; execution intent alone is not measured output.
