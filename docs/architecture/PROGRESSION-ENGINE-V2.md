# Progression Engine V2

## Purpose

This document is the formal specification for Fitness Progression Engine V2.

It exists to keep progression behavior deterministic, explicit, and inspectable across routine defaults, exercise-level overrides, Today Progression Updates, progression audit, session hints, and future migration work.

This is a spec-only document. It does not change runtime behavior by itself.

## Scope

Progression Engine V2 formalizes the progression model as layered configuration instead of one overloaded "method" selector.

The engine must keep these layers separate:

- `Training Focus`: intent
- `Measurement Type`: what can be measured
- `Qualification Policy`: proof required
- `Progression Vector`: what changes
- `Progression Step`: how much it changes
- `Promotion Policy`: how updates apply
- `Regression Policy`: how targets recover
- `Set Flow`: how today's sets are arranged
- `Cycle Review`: when changes are evaluated

## Core Rules

- Rule: Completed workout truth is the only valid source for promotion or regression claims.
- Rule: A promotion candidate must trace back to one qualifying completed exposure; do not pool sets from separate sessions into one fake promotion.
- Rule: Progression method and Set Flow are separate layers.
- Rule: Rep range display and promotion logic are separate concerns.
- Rule: Card fill indicates closeness to promotion; it must not invent fake Ready Updates.
- Rule: Today/cycle review is the safe place to apply target updates; live logging records truth and does not mutate routine targets.
- Rule: Backward compatibility must preserve current double progression behavior unless a user or migration explicitly opts into different promotion controls.

## Layer Model

### 1. Training Focus

`Training Focus` captures user intent such as strength, hypertrophy, rehab, endurance, or a customized variant.

Responsibilities:

- Seeds routine default progression presets.
- Helps choose sensible defaults for measurement, vector, step, and Set Flow.
- Does not execute progression by itself.

Non-responsibilities:

- Does not prove qualification.
- Does not decide promotion math.
- Must not be reverse-inferred from lower-level edits once the user customizes behavior.

### 2. Measurement Type

`Measurement Type` defines what the exercise can measure and therefore what progression vectors are valid.

Examples:

- weight + reps
- reps only
- duration
- distance
- duration + distance

Responsibilities:

- Constrains valid targets.
- Constrains valid progression vectors.
- Constrains which qualification proofs are meaningful.

Non-responsibilities:

- Does not imply that every measurable field participates in promotion.

### 3. Qualification Policy

`Qualification Policy` answers whether the user earned an update.

Examples:

- all required working sets meet the target
- best qualifying completed exposure meets the target
- top set reaches a custom threshold
- review-only completion without auto-promotion

Responsibilities:

- Resolves candidate status from completed workout truth.
- Produces inspectable reasons for `ready`, `not_ready`, `review`, `deload`, or equivalent engine states.

Non-responsibilities:

- Does not choose what target field changes next.
- Does not decide step size.

### 4. Progression Vector

`Progression Vector` defines what changes after qualification.

Examples:

- increase weight
- increase reps
- increase weight and reset reps lower
- increase duration
- increase distance
- coupled duration + distance change

Responsibilities:

- Expresses the target mutation shape.
- Must be measurement-aware.

Non-responsibilities:

- Does not prove readiness.
- Does not decide step size by itself.

### 5. Progression Step

`Progression Step` defines how much the vector changes the next target.

Examples:

- `+5 lb`
- `+1 rep`
- `+30 sec`
- `+0.25 mi`
- equipment-aware dumbbell increments

Responsibilities:

- Supplies deterministic mutation size.
- Uses the existing precedence chain where applicable: exercise override, equipment default, routine default, Training Focus seed, app fallback.

Non-responsibilities:

- Does not create promotions when the step is zero or invalid.

### 6. Promotion Policy

`Promotion Policy` defines how earned updates apply to planned targets.

Examples:

- explicit review/apply
- grouped linked apply when fingerprints match and the user selects the rows
- legacy review-only states

Responsibilities:

- Governs whether a candidate becomes an actionable Ready Update or stays status-only.
- Preserves Revert safety with an exact before/after snapshot.

Non-responsibilities:

- Does not change qualification truth.

### 7. Regression Policy

`Regression Policy` defines how targets recover downward after stalls or failure patterns.

Examples:

- none
- deload-after-stall
- review-only regression

Responsibilities:

- Produces inspectable downward-recovery behavior from completed workout truth.

Non-responsibilities:

- Must not be conflated with progression method or Set Flow.

### 8. Set Flow

`Set Flow` defines how today's planned sets are arranged within a workout.

Examples:

- straight sets
- ascending ramp
- descending backoff

Responsibilities:

- Shapes planned set structure and advisory set targets.

Non-responsibilities:

- Does not determine promotion eligibility.
- Does not mutate completed logs.
- Does not replace progression math.

### 9. Cycle Review

`Cycle Review` defines when change evaluation occurs.

Current model expectations:

- review happens after completed workout truth exists
- Today may surface explicit Ready Updates before the next workout starts
- routine cycles are anchored by `start_date + cycle_length_days`, not weekday assumptions

Responsibilities:

- Determines evaluation timing.
- Keeps target mutation out of the live logger.

## Promotion Controls

Progression Engine V2 adds two promotion-specific controls:

- `promotionBasis`
- `repPromotionThreshold`

These controls refine promotion logic without changing the broader layered model.

### `promotionBasis`

`promotionBasis` defines which metric(s) the app uses to decide whether promotion is earned for rep-range-based strength or bodyweight patterns.

Allowed values:

- `weight_only`
- `reps_only`
- `weight_and_reps`

Meaning:

- `weight_only`: qualification ignores rep-range ceiling as the promotion gate and uses load-focused proof rules.
- `reps_only`: promotion is decided by reps without requiring load increase participation.
- `weight_and_reps`: promotion uses both load context and rep performance. This is the default for current double progression behavior.

### `repPromotionThreshold`

`repPromotionThreshold` defines how high in the current rep range the user must get for rep-based qualification.

Allowed values:

- `top_of_range`
- `top_half_of_range`
- `custom`

Meaning:

- `top_of_range`: qualification requires reaching the max reps of the configured range unless another qualification rule explicitly narrows the proof surface.
- `top_half_of_range`: qualification requires reaching the top-half threshold of the configured range.
- `custom`: qualification requires a configured custom rep target.

Top-half formula:

`top_half_of_range = ceil((minReps + maxReps) / 2)`

Example:

- `8-12` becomes `10+`

## Defaults

- `promotionBasis` defaults to `weight_and_reps` where current double progression behavior already applies.
- `repPromotionThreshold` defaults to `top_of_range`.
- Existing routines and exercise configs must preserve current behavior unless explicitly migrated or edited.
- If a measurement type does not use rep-range promotion, these fields may remain unset or ignored by the engine while preserving data-model compatibility.

## Required Clarifying Note

- Rule: A rep range answers "what reps should I aim for?" Promotion basis answers "what does the app use to decide progression?" Rep threshold answers "how high in the rep range is good enough?"

## Simplicity Note

- Pattern: Keep user-facing controls simple while allowing engine-facing configuration to be more expressive.

## Failure Warning

- Failure Mode: Do not infer that reps participate in promotion just because a rep range exists.

## Separation of Rep Range Display vs Promotion Logic

Rep range display and promotion logic must remain explicitly separate.

Rep range display answers guidance questions:

- what reps should I aim for today?
- what range is programmed for this exercise?

Promotion logic answers engine questions:

- what proof is required for promotion?
- do reps participate in promotion at all?
- if reps do participate, what threshold counts as sufficient?

Examples:

- An exercise can display `8-12 reps` while using `promotionBasis = weight_only`.
- An exercise can display `8-12 reps` while using `promotionBasis = reps_only` and `repPromotionThreshold = top_half_of_range`, meaning `10+` is enough for promotion.
- An exercise can display `8-12 reps` while using `promotionBasis = weight_and_reps` and `repPromotionThreshold = top_of_range`, which preserves classic double progression.

## UI Language

User-facing labels for V2 controls should use the following copy:

- `Promotion uses`
- `Weight only`
- `Reps only`
- `Weight + reps`
- `Rep target for promotion`
- `Top of range`
- `Top half of range`
- `Custom rep target`

UI rules:

- Keep routine-default education richer than execution surfaces.
- Keep add-exercise, edit-day, Today cards, and the live logger compact.
- Show promotion-specific controls only when the measurement type and progression pattern make them relevant.
- Do not expose engine jargon when a simpler label communicates the same choice.

## Use Cases

### Strength-focused weight-only progression

Intent:

- prioritize load increases

Example configuration:

- `Training Focus = strength`
- `Measurement Type = weight + reps`
- `Qualification Policy = qualifying completed exposure at programmed load`
- `promotionBasis = weight_only`
- rep range may still display for guidance
- `repPromotionThreshold` may be ignored
- `Progression Vector = increase weight`

Expected behavior:

- the rep range guides execution
- promotion is decided from the weight-focused proof policy, not from merely having a rep range

### Bodyweight or rehab reps-only progression

Intent:

- keep load fixed or absent and progress through reps

Example configuration:

- `Training Focus = rehab` or customized bodyweight
- `Measurement Type = reps only`
- `promotionBasis = reps_only`
- `repPromotionThreshold = top_of_range` or `custom`
- `Progression Vector = increase reps`

Expected behavior:

- promotion depends on reps
- no load increase is required

### Classic double progression

Intent:

- build reps at a given load, then increase load and reset reps lower

Example configuration:

- `Training Focus = hypertrophy` or strength-hypertrophy hybrid
- `Measurement Type = weight + reps`
- `promotionBasis = weight_and_reps`
- `repPromotionThreshold = top_of_range`
- `Progression Vector = increase weight and reset reps lower`

Expected behavior:

- current behavior remains the default
- users build toward the top of the rep range at the current load
- promotion increases weight by the configured step and resets reps according to the existing vector logic

### Accessories where top-half threshold is acceptable

Intent:

- reduce grind on accessory movements while keeping progression explicit

Example configuration:

- `Training Focus = hypertrophy`
- `Measurement Type = weight + reps` or `reps only`
- `promotionBasis = reps_only` or `weight_and_reps`
- `repPromotionThreshold = top_half_of_range`

Expected behavior:

- an `8-12` range qualifies at `10+`
- the rep range still displays as `8-12`
- promotion logic uses the threshold, not the display ceiling

## Validation Rules

- `promotionBasis` must be one of `weight_only`, `reps_only`, `weight_and_reps`.
- `repPromotionThreshold` must be one of `top_of_range`, `top_half_of_range`, `custom`.
- `repPromotionThreshold = custom` requires a concrete custom rep target field in the underlying config.
- Custom rep targets must be integers.
- Custom rep targets must be greater than or equal to `minReps`.
- Custom rep targets should normally be less than or equal to `maxReps`; if the product later allows above-range thresholds, that exception must be explicit.
- `top_half_of_range` is valid only when both `minReps` and `maxReps` exist.
- If no rep range exists, rep-threshold settings must be ignored or rejected according to the measurement type contract.
- `promotionBasis = reps_only` requires a reps-capable measurement type.
- `promotionBasis = weight_only` requires a load-capable qualification path.
- `promotionBasis = weight_and_reps` requires a config where both metrics are meaningful to the promotion policy.
- Zero or invalid progression steps must not create a Ready Update.
- Set Flow must not alter qualification results by mutating logged truth.

## Backward Compatibility

- Existing double progression configs should resolve as `promotionBasis = weight_and_reps` and `repPromotionThreshold = top_of_range` even if older stored payloads do not contain those explicit fields yet.
- Legacy manual review or hold-and-review rows remain valid and should not be reinterpreted as new promotion-basis variants.
- Old configs that store only rep range plus existing double progression method must keep their prior promotion behavior after V2 lands.
- Existing rep ranges must not suddenly imply reps-only promotion.
- Existing audit, Today, and card-fill behavior must keep deriving from the same candidate/status evidence path.

## Migration Implications

- This is a compatibility-first migration shape.
- Runtime migration should be additive, not destructive.
- Existing configs may continue to deserialize without the new fields.
- Resolver logic should inject V2 defaults at read time where legacy double progression currently exists.
- Optional backfill migrations may later write explicit `promotionBasis` and `repPromotionThreshold` into stored configs for clarity, but runtime behavior should not depend on that backfill existing first.
- Migration work must preserve inspectability in progression audit by showing both stored config and resolved defaulted behavior where helpful.

## API and Data-Model Implications

Spec-level expectation:

- progression playbook config payloads should support optional `promotionBasis`
- progression playbook config payloads should support optional `repPromotionThreshold`
- if `repPromotionThreshold = custom`, payloads should support a companion custom rep target field

Suggested config shape:

```ts
type PromotionBasis = "weight_only" | "reps_only" | "weight_and_reps";

type RepPromotionThreshold =
  | "top_of_range"
  | "top_half_of_range"
  | "custom";

type ProgressionPromotionConfig = {
  promotionBasis?: PromotionBasis;
  repPromotionThreshold?: RepPromotionThreshold;
  customRepPromotionTarget?: number | null;
};
```

Resolver expectations:

- Omitted fields are legal for legacy rows.
- Resolved engine config may be more explicit than stored config.
- API surfaces that expose progression config should distinguish stored values from resolved defaults when inspectability matters.
- Server mutation paths should validate these fields before persistence.

## Audit and Display Implications

Progression audit should be able to explain:

- configured rep range
- resolved `promotionBasis`
- resolved `repPromotionThreshold`
- computed threshold value when using `top_half_of_range` or `custom`
- why a candidate is ready or not ready
- whether the rep range is guidance-only for this configuration

Today and card-fill surfaces should:

- stay compact
- reuse the same candidate/status truth
- avoid turning status-only details into fake actions

## Test Scenarios

These are spec scenarios only. They are not runtime tests.

1. Legacy double progression config with rep range `8-12` and no new fields resolves to `weight_and_reps` plus `top_of_range`.
2. `top_half_of_range` with `8-12` resolves the promotion threshold to `10`.
3. `reps_only` with `8-12` and `top_half_of_range` qualifies at `10`, `11`, or `12` without requiring a load increase.
4. `weight_only` with visible rep range does not infer rep-based promotion.
5. `custom` threshold rejects missing `customRepPromotionTarget`.
6. `custom` threshold accepts a valid integer custom target.
7. Set Flow changes from straight sets to backoff do not by themselves change promotion eligibility when completed truth is unchanged.
8. Card fill can show sub-100% progress for a not-ready row without creating a Ready Update.
9. Manual review and hold-and-review legacy rows remain status/review behavior, not auto-promotion behavior.
10. Linked same-fingerprint apply/revert behavior remains governed by Promotion Policy and fingerprint verification, not by promotion-basis fields alone.
11. No candidate is created when the step policy resolves to zero or invalid.
12. Rep range display remains `8-12` while promotion threshold evaluates against `10+` for top-half accessories.

## Non-Goals

- This spec does not redefine Set Flow execution behavior.
- This spec does not introduce new runtime-only recommendation layers.
- This spec does not allow card-fill visuals to invent progression candidates.
- This spec does not collapse regression policy into promotion-basis choices.

## Summary

Progression Engine V2 keeps Fitness progression deterministic by making promotion logic more explicit without exploding the user-facing model. Rep ranges remain guidance. Qualification remains proof. Promotion basis defines which metric participates in progression. Rep threshold defines how high in the range is sufficient when reps are part of the proof. Set Flow stays separate from progression math, and backward compatibility preserves existing double progression behavior by default.
