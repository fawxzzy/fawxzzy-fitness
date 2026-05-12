# Progression Engine V2

## Status

- Manual review is paused while one more progression-core batch lands.
- PR #16 remains the frozen release checkpoint.
- This document is a spec and roadmap truth source only. It does not itself imply runtime support for every layer listed below.

## Core Rule

Progression is one deterministic layered engine, not a set of separate progression-style engines.

- `promotionBasis` answers what measurements prove readiness.
- `targetMutation` answers what target values change after readiness is proven.
- Baseline routine targets stay canonical.
- Modifiers may compute effective targets, but they must not overwrite stored baseline targets unless a concrete promotion or regression rule says they should.

## Canonical Layer Order

1. Training Focus
2. Measurement Type
3. Qualification Policy
4. Qualification Window
5. Promotion Basis
6. Rep Promotion Threshold
7. Target Mutation / Progression Vector
8. Progression Step
9. Promotion Policy
10. Regression Policy
11. Set Flow
12. Effort Schedule / Wave Modifier
13. Focus Rotation / Conjugate Modifier
14. Capability Anchors

## Layer Definitions

### Training Focus

Defines the high-level goal context such as muscle, strength, conditioning, or technique/rehab. This seeds defaults, but it does not create a separate engine.

### Measurement Type

Defines which target dimensions exist for the exercise:

- `reps`
- `time`
- `distance`
- `time_distance`
- `none`

### Qualification Policy

Defines what a single logged session must do to count as a qualified exposure.

Examples:

- all checked sets at top reps
- target duration complete
- target distance complete
- target time + distance complete
- manual review

### Qualification Window

Defines how many independently qualifying sessions are required before promotion is ready.

```ts
type QualificationWindowConfig = {
  requiredQualifiedSessions: number;
  mode: "latest" | "consecutive" | "within_cycle";
  resetOnMiss: boolean;
};
```

Default:

- `requiredQualifiedSessions = 1`
- `mode = "latest"`
- `resetOnMiss = false`

Rules:

- Never pool sets from separate sessions into one fake qualified exposure.
- Each counted session must independently satisfy the qualification policy.
- Unsupported cycle-window evidence must degrade safely instead of inventing certainty.

### Promotion Basis

Defines which measurements participate in readiness.

Examples:

- `weight_only`
- `reps_only`
- `weight_and_reps`
- time-only and distance-aware measurement sets for cardio

This layer does not decide what changes after promotion.

### Rep Promotion Threshold

Defines which rep threshold counts as passing when reps participate in readiness.

Examples:

- `top_of_range`
- `top_half_of_range`
- custom threshold

### Target Mutation

Defines what target values change after readiness is proven.

Canonical target mutation ids:

- `increase_load`
- `increase_reps`
- `increase_load_reset_reps`
- `increase_load_and_reps`
- `increase_duration`
- `increase_distance`
- `increase_duration_and_distance`
- `none`

Examples:

- `increase_load`: `135 x 8-12 -> 140 x 8-12`
- `increase_reps`: `135 x 8-12 -> 135 x 9-13`
- `increase_load_reset_reps`: `135 x 8-12 -> 140 x 8`
- `increase_load_and_reps`: `135 x 8-12 -> 140 x 9-13`
- `increase_duration`: `20:00 -> 21:00`
- `increase_distance`: `2.0 mi -> 2.1 mi`
- `increase_duration_and_distance`: both time and distance move together when the mode supports that
- `none`: review/manual only

Rule:

```text
promotionBasis decides readiness.
targetMutation decides what changes.
```

### Progression Step

Defines the amount of change applied by the mutation layer.

Examples:

- load step
- rep step
- duration step
- distance step

### Promotion Policy

Defines how earned promotions are surfaced or applied.

Examples:

- manual review
- auto at cycle start

### Regression Policy

Defines how repeated misses affect the target.

Example:

- deload after stall

### Set Flow

Defines how the workout target is expressed within the session, not whether promotion happened.

Examples:

- straight sets
- ascending ramp
- descending backoff

### Effort Schedule / Wave Modifier

Future layer. This is not a separate engine.

Rules:

- Stored baseline target remains canonical.
- Day or cycle modifiers compute effective targets.
- Effective targets do not mutate stored routine targets by themselves.

Examples:

- heavy / medium / light exposure
- rep-wave emphasis
- fatigue-managed weekly pattern

### Focus Rotation / Conjugate Modifier

Future layer. This is not a separate engine.

Rules:

- strength, speed, hypertrophy, technique, and rehab are focus transforms, not separate engines
- speed is execution intent unless speed is explicitly measured

Examples:

- max effort focus
- dynamic effort focus
- hypertrophy block focus

### Capability Anchors

Future layer that defines the baseline truth used to seed or re-seed targets.

Candidate anchors:

- recent logs
- current routine target
- user-provided last/best/PR
- safe manual fallback

## Legacy Mapping

Legacy double progression resolves to:

```text
promotionBasis = weight_and_reps
repPromotionThreshold = top_of_range
targetMutation = increase_load_reset_reps
```

This preserves the current readiness rule while making the mutation rule explicit.

## New Load + Reps Together Behavior

The new explicit mutation strategy is:

```text
targetMutation = increase_load_and_reps
```

Example:

```text
3x8-12 @ 135
-> 3x9-13 @ 140
```

This is not a new engine. It is a different mutation choice inside the same engine.

## Implementation Scope

Stable core for the next batch:

1. docs/spec update
2. target mutation foundation with `increase_load_and_reps`
3. qualification window foundation
4. compact editor controls
5. checklist refresh

Documented but intentionally deferred:

- effort wave runtime
- effort wave UI
- conjugate/focus runtime
- conjugate/focus UI
- capability anchor onboarding

## Non-Goals For This Lane

- no runtime changes
- no editor UI changes
- no migrations
- no deploy
- no release record
- no remote mutation
