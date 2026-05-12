# Progression V2 Manual Review Status

## Status

Manual review may start only after the final pre-review stack is committed and the repo is back to a clean readiness state.

Release guardrails remain unchanged:

- PR #16 stays frozen/open/draft and unmerged
- no deploy
- no `release:fitness:record`
- no remote mutation

## Pending Before True Manual Review

The following implementation lanes must land first:

1. progression layer spec update
2. target mutation foundation
3. qualification window foundation
4. compact editor UI for target mutation and required successful sessions
5. final checklist re-layout

## Restart Condition

Resume the full manual review only when all of the following are true:

- Prompt 11 is committed
- Prompt 12 is committed
- Prompt 13 is committed
- Prompt 14 is committed
- Prompt 15 is committed
- `git status` is clean for the intended lane
- `npm run typecheck` passes
- `npm run verify` passes
- `npm run lint` passes
- `npm run migration:validate` passes
- `npm run qa:llel:progression` passes
- `npm run release:fitness:ready` passes

## Target Mutation Strategy

Core distinction:

- `Promotion uses` answers what proves readiness
- `Target changes` answers what mutates after readiness is earned

Review checks:

- [ ] `weight_and_reps` is treated as readiness, not mutation
- [ ] legacy double progression still maps to `Load + reset reps`
- [ ] `Load + reps` is available when active load + reps targets exist
- [ ] `Load only` changes load without changing reps
- [ ] `Reps only` changes reps without changing load
- [ ] cardio targets expose only supported `Time only`, `Distance only`, or `Time + distance`
- [ ] calories are detected but not exposed as mutation controls
- [ ] clearing temporary goal targets does not silently rewrite a saved mutation strategy

Target preview checks:

- [ ] if a target preview is shown later, it must agree with the actual mutation math
- [ ] no preview is required for this batch; absence is acceptable

## Qualification Window

Core rule:

- each counted successful session must independently satisfy readiness
- partial sets from separate sessions must never pool into one fake successful session

Review checks:

- [ ] default `Require successful sessions` is `1`
- [ ] selecting `2` blocks promotion after one independently qualifying session
- [ ] selecting `3` blocks promotion until three independently qualifying sessions exist
- [ ] session-count control round-trips without breaking saved config
- [ ] Progression Status shows partial copy such as `1 of 2 qualifying sessions complete`
- [ ] unsupported cycle-window paths stay clearly unsupported and do not invent proof
- [ ] advanced `latest` / `consecutive` / `within_cycle` semantics remain deferred in the compact editor UI

## Future Layers Documented But Not Implemented

These should remain docs-only in this lane:

- [ ] effort wave / undulating runtime is not implemented
- [ ] effort wave UI is not implemented
- [ ] focus rotation / conjugate runtime is not implemented
- [ ] focus rotation / conjugate UI is not implemented
- [ ] capability anchor runtime is not implemented
- [ ] capability anchor onboarding is not implemented

## Updated Red Flags

Stop review if any happen:

- [ ] `weight_and_reps` is treated as both readiness and mutation
- [ ] `Load + reps` resets reps accidentally
- [ ] multi-session gating pools partial evidence across sessions
- [ ] `Require successful sessions` changes target values instead of gating readiness
- [ ] effort-wave concepts mutate stored baseline targets
- [ ] UI exposes advanced qualification modes without clear supported semantics
- [ ] cardio mutation options expose unsupported calorie combinations
- [ ] Session or release flows change outside the routine/editor progression surfaces

## Updated Command Checklist

Baseline:

```powershell
npm run typecheck
npm run verify
npm run lint
npm run migration:validate
npm run qa:llel:progression
npm run release:fitness:ready
```

Target mutation and qualification window coverage:

```powershell
node --import ./scripts/register-test-aliases.mjs --test `
  src/lib/progression-target-mutation.test.ts `
  src/lib/progression-qualification-window.test.ts `
  src/lib/progression-playbooks.test.ts `
  src/lib/progression-status-display.test.ts
```

Editor and form-state coverage:

```powershell
node --import ./scripts/register-test-aliases.mjs --test `
  src/lib/progression-playbook-form-state.test.ts `
  src/lib/progression-playbook-ui-options.test.ts `
  src/lib/edit-day-exercise-draft.test.ts
```

## Manual Review May Start

Manual review may start when the restart condition above is fully satisfied and no red flags are active.
