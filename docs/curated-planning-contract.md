# Curated planning intake contract

Status: source-only planning foundation

Contract: `fitness.planning-intake.v1`

Source intake: `fawxzzy-fitness.curated-onboarding.v3`
Normalizer: `curated-planning-normalizer.v1`

## Boundary

The current production path passes `CuratedOnboardingData` from
`src/app/curated-onboarding/actions.ts` directly to the generator in
`src/features/curated-onboarding/engine.ts`. This package does not change that
path. It adds a pure normalization boundary for a later catalog and planner.

This contract does not:

- select exercises or a program archetype;
- change routine generation, persistence, activation, or existing routines;
- infer diagnoses, medical clearance, or starting loads;
- add provider, database, authentication, migration, billing, secret, health
  endpoint, or deployment behavior.

## Pipeline

```text
CuratedOnboardingData.intakeResponses
  -> validate visible response shape and conditional completeness
  -> normalize semantic planning fields
  -> classify constraints, provenance, and deterministic issues
  -> project only generation-influencing fields
  -> canonical JSON
  -> SHA-256 generation projection digest
```

`normalizeCuratedPlanningIntake` reads the raw `intakeResponses` map. It does
not trust the legacy top-level derived fields on `CuratedOnboardingData`.
Hidden answers are removed with the same questionnaire visibility rules used
by the form before validation and normalization.

## Constraint classes

| Class | Meaning | Current contract representation |
|---|---|---|
| Blocking | Planning must not proceed until resolved | `normalizationIssues` with `severity: "blocking"` and `constraintClasses.blockingIssueCodes` |
| Hard | A future planner must never violate the value | Fixed schedule, duration maximum, available/avoided equipment, safety restrictions, excluded exercises |
| Required coverage | Must be represented or reported infeasible | Primary/secondary goals, target areas, movement skills, required exercises, cardio priority |
| Optimization | May rank otherwise feasible choices | Background, recovery, preferences |
| Context only | Retained for delivery, explanation, or future calibration | Nutrition, delivery, acknowledgments, known performance context |

Hard constraints must be feasibility filters. A future planner must not place
them in weighted scoring where a higher preference score could override them.

## Field disposition

| Normalized path | Source answers | Planner purpose |
|---|---|---|
| `schedule.requestedDaysPerWeek` | `trainingDaysPerWeek` | Required weekly workout count |
| `schedule.weekdays` | `preferredTrainingDays` | Exact requested weekday set |
| `schedule.dayConstraint` | `preferredTrainingDays` | Fixed only when exact days are supplied; otherwise count-only/unknown |
| `schedule.flexibility` | Current answer set | `unknown` until the questionnaire distinguishes fixed from preferred days |
| `schedule.sessionMinutes` | `workoutLength` | Target and hard session ceiling |
| `schedule.preferredTrainingTime` | `trainingTime` | Adherence/display context; excluded from exercise feasibility |
| `goals.primary` | `primaryGoal`, then `mainGoals` | Highest-priority program outcome |
| `goals.secondary` | Ordered `topThreeGoals` lines | Ranked required coverage |
| `goals.targetAreas` | `areasToImprove` | Canonically ranked, currently unranked coverage inputs |
| `goals.movementSkills` | `movementsToImprove` | Canonically ranked, currently unranked skill inputs |
| `goals.bodyCompositionDirection` | `weightDirection` | High-level goal context, not a direct exercise selector |
| `trainingBackground.experience` | `trainingExperience` | Conservative program complexity context |
| `trainingBackground.recentContinuity` | Current answer set | `unknown`; requires a justified conditional question |
| `trainingBackground.currentProgram` | `currentRoutine`, `currentSplit` | Transition and duplication context |
| `trainingBackground.trackingExperience` | `tracksWorkouts` | Progression UX readiness |
| `trainingBackground.progressionReadiness` | Current answer set | `uncalibrated`; no starting load is inferred |
| `trainingBackground.knownPerformanceContext` | `mainLiftNumbers` | Historical context only; excluded from initial load generation |
| `environment.locations` | `trainingLocations` | Environment compatibility |
| `environment.equipmentAvailable` | `availableEquipment` | Exact equipment capabilities; never widened into broader classes |
| `environment.equipmentAvoided` | `equipmentAvoid` | Equipment exclusions for a future constraint compiler |
| `environment.equipmentLimits` | `heaviestDumbbells` | Bounded dumbbell capability plus source text |
| `recovery.outsideActivityLoad` | `outsideActivity` | Conservative weekly-load context |
| `recovery.sleepBand` | `sleepHours` | Conservative recovery modifier |
| `safety.movementRestrictions` | `professionalRestrictions`, `restrictedMovements`, `painDetails` | Known demand restrictions, without diagnosis |
| `safety.excludedExerciseNames` | `exercisesCannotDo` | Exact hard exercise exclusions |
| `safety.uncomfortableExerciseNames` | `uncomfortableExercises` | Explicit discomfort context, separate from diagnosis |
| `safety.warningFlags` | `warningSymptoms` | Stable plan-blocking flags |
| `safety.unresolvedItems` | Safety validation results | Fail-closed ambiguity |
| `safety.professionalDirection` | `professionalRestrictions`, `restrictedMovements` | User-reported professional direction and clearance uncertainty |
| `safety.acknowledgments` | `safetyAcknowledgment`, `fitnessGuidanceAcknowledgment` | Audit/context only |
| `preferences.requiredExerciseNames` | Current answer set | Empty until required/preferred intent is captured explicitly |
| `preferences.preferredExerciseNames` | `exerciseEnjoy` | Soft preference |
| `preferences.improvementMovementIds` | `movementsToImprove` | Coverage preference |
| `preferences.dislikedExerciseNames` | `exerciseHate` | Soft de-prioritization, not a medical restriction |
| `preferences.planStyle` | `planStyle` | Feasible session-structure preference |
| `preferences.equipmentPreference` | `equipmentPreference` | Soft equipment preference |
| `preferences.cardio` | Cardio priority, mode, avoid, and frequency answers | Cardio requirement and preference context |
| `planContext.biggestTrainingStruggles` | `trainingStruggles` | Coaching/adherence context |
| `planContext.nutrition` | Nutrition answers | Nutrition and follow-up content only |
| `planContext.delivery` | Detail, content, delivery, and follow-up answers | Rendering and workflow only |

The `provenance` map records stable normalized paths, source question IDs,
semantic response digests, and versioned rule IDs. It does not duplicate raw
answer text. Provenance is parallel to the planning object so adding audit
details does not alter planner semantics.

## Unknown, absent, restricted, and ambiguous

- `null`, empty arrays, and `unknown` mean the current answers do not establish
  a value. They never mean unrestricted.
- A known restriction produces `safety.status: "restricted"` and stable demand
  tags such as `NO_OVERHEAD_LOADING`; it does not create a diagnosis.
- Missing, malformed, contradictory, or unresolved required safety input
  produces a blocking issue and a blocked/ambiguous safety state.
- Selecting `Other` without usable custom detail is blocking. A free-text
  safety `Other` remains ambiguous even when non-empty because current v1
  cannot safely infer its movement scope.
- Recovery answers may make later planning more conservative. They must never
  increase volume.

## Canonical ordering

`canonicalizeJson` serializes objects with lexicographically sorted keys,
preserves array order, and rejects `undefined` or unsupported numeric values.
The normalizer sorts and de-duplicates semantically unordered sets before
canonicalization. Ranked goals preserve their explicit order.

The portable SHA-256 helper hashes the UTF-8 bytes of canonical JSON. Tests
cross-check its output against Node's standard-library implementation while
the runtime module remains usable without a Node crypto dependency.

## Generation projection digest

`buildPlanningGenerationProjection` includes:

- contract and normalizer versions;
- deterministic blocking issues because they change whether planning may run;
- schedule constraints;
- ordered goals and coverage priorities;
- training background needed by a planner;
- exact environment and equipment constraints;
- recovery modifiers;
- safety state, restrictions, exclusions, and unresolved items;
- exercise, plan-style, and cardio preferences.

It excludes:

- raw-response and database identifiers;
- timestamps and localized labels;
- provenance and source-response digests;
- `planContext` nutrition/delivery fields;
- safety acknowledgments;
- known historical lift values;
- presentation copy.

Changing an unordered set's input order therefore does not change the digest,
while changing a ranked goal, exact weekday, safety restriction, or
generation-influencing version does.

`generationProjectionDigest` is not a persisted-plan digest and is not proof
of creation idempotency. Those require separately versioned catalog, planner,
coverage, prescription, and persistence contracts.

## Golden fixtures

`src/features/curated-onboarding/planning/fixtures.ts` defines the ten frozen
normalization inputs:

1. `beginner-home-3day-general-strength`
2. `beginner-planet-fitness-4day-muscle-gain`
3. `intermediate-freeweights-5day-strength`
4. `time-limited-3day-30min`
5. `bodyweight-travel-4day-general-fitness`
6. `cardio-priority-4day-hybrid`
7. `lower-emphasis-4day-secondary-upper`
8. `no-overhead-3day-substitution`
9. `ambiguous-warning-blocked`
10. `pullup-priority-no-pull-equipment`

The fixture module exports normalized outputs, and tests pin the reviewed
generation projection digest for each. The ambiguous-warning fixture is the
only intentionally blocked normalization.

## Missing questionnaire decisions

The current questionnaire is broad enough for this foundation. A future
planner must still fail closed or request conditional clarification for:

1. whether selected weekdays are fixed requirements or preferences;
2. which location/equipment inventory applies to each selected day;
3. structured recent training continuity for experienced but inactive users;
4. the movement scope of ambiguous pain or limitation text;
5. whether a named exercise is required, preferred, or merely a skill target.

These are targeted conditional questions, not justification for a larger
general questionnaire.

## Future consumption and governed dependencies

A future catalog/constraint compiler may consume only the normalized contract,
not raw questionnaire IDs. It must validate contract and policy versions,
reject blocking issues, compile hard constraints before scoring, preserve
exact equipment capabilities, and produce a structured infeasibility result
when required coverage cannot be satisfied.

Persistence integration is a later governed packet. Before it can claim
lossless or idempotent creation, the repository needs evidence for:

- storage of the normalized/request/plan semantic digests and all policy
  versions;
- lossless retention of warm-ups, substitutions, progression metadata,
  explanations, and provenance;
- a concurrency-safe uniqueness contract for user plus generation request;
- persisted round-trip semantic-digest validation;
- creation and activation as separate operations.

No such provider or schema change is part of this contract-only package.
