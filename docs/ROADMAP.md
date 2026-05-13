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

## Current Pre-Review Sequence

Completed:

1. Prompt 11: progression layer spec update
2. Prompt 12: target mutation foundation
3. Prompt 13: qualification window foundation
4. Prompt 14: compact editor UI for target mutation and required successful sessions
5. Prompt 15: manual review checklist re-layout
6. Prompt 16: target preview under `Target changes`
7. Prompt 17: shared header second-row rail
8. Prompt 18: effort-wave pure engine
9. Prompt 19: effort-wave day-pill UI
10. Prompt 20: capability anchors and focus seed helpers
11. Prompt 21: focus rotation advisory UI
12. Prompt 22: rolling `N`-day live schedule mode and persistence

Remaining:

1. Prompt 23: performance / slowness audit
2. Prompt 24: final manual review checklist refresh

## Stable Core In Scope

- target mutation foundation
- `increase_load_and_reps`
- qualification window / multiple successful sessions
- compact editor controls
- checklist refresh

## Future Roadmap Lanes

These still remain deferred after the current pre-review batch:

- capability anchor onboarding and explicit anchor editing
- richer focus-source selection across same-exercise cross-day baselines
- advanced qualification window UI for `latest`, `consecutive`, `within_cycle`, and `resetOnMiss`
- deeper effort-wave editing beyond compact up/baseline/down day pills
- any performance work that would require data-layer rewrites or stale caching

## Schedule Mode Status

- Routine schedule mode is now explicit and persisted.
- `weekday_anchored` and `rolling_n_day` remain one schedule layer, not inferred from cycle length alone.
- Rolling schedules reuse the stored anchor date and repeat strictly by modulo.

## Design Rules For Future Layers

- Baseline targets stay canonical.
- Modifiers compute effective targets instead of mutating stored routine targets.
- Focus rotation changes context, not engine identity.
- Speed or power claims require measured speed/power data; execution intent alone is not measured output.
