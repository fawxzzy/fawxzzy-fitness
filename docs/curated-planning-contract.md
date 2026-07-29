# Curated planning intake contract

Status: source-only planning and exercise-catalog foundation

Contract: `fitness.planning-intake.v1`

Source intake: `fawxzzy-fitness.curated-onboarding.v3`
Normalizer: `curated-planning-normalizer.v1`

## Boundary

The current production path passes `CuratedOnboardingData` from
`src/app/curated-onboarding/actions.ts` directly to the generator in
`src/features/curated-onboarding/engine.ts`. This package does not change that
path. It adds a pure normalization boundary and a reviewed exercise-catalog
boundary for a later coverage compiler and planner.

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

Malformed array members are recorded as blocking response-type issues and
discarded before semantic normalization, so a forged persisted payload cannot
turn a deterministic blocked result into a runtime exception.

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
| `safety.movementRestrictions` | `professionalRestrictions`, `restrictedMovements` | Known professionally reported demand restrictions, without diagnosis |
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
- provenance, source-response digests, and issue source-question IDs;
- `planContext` nutrition/delivery fields;
- safety acknowledgments;
- known historical lift values;
- presentation copy.

Changing an unordered set's input order therefore does not change the digest,
while changing a ranked goal, exact weekday, safety restriction, or
generation-influencing version does.

`generationProjectionDigest` is not a persisted-plan digest and is not proof
of creation idempotency. Those require separately versioned planner, coverage,
prescription-output, and persistence contracts.

## Exercise catalog v1

`src/features/curated-onboarding/planning/catalog/` defines the source-only
`fitness.exercise-catalog.v1` boundary. Its current frozen identities are:

- catalog: `fitness.exercise-catalog.2026-07-28.v1`;
- movement restrictions: `fitness.movement-restrictions.v1`;
- prescription classes: `fitness.prescription-classes.v1`.

The bundle contains 27 reviewed active exercises from the existing canonical
global catalog, 14 exact equipment capabilities, nine restriction mappings,
four prescription classes, and 17 equipment-alternative substitution rules.
The focused test resolves every exercise ID and presentation name against
`supabase/data/global_exercises_catalog_index.json`; the canonical source and
index remain read-only.

Equipment is executable capability, not a broad location label. For example,
`treadmill`, `bike`, `cables`, `machines`, and `smith-machine` remain distinct.
The canonical free-weight capability is `barbells`, matching the normalized
questionnaire contract; singular `barbell` is a lookup alias only.
Required and avoided equipment are hard filters. Removing a capability cannot
introduce a compatible exercise, and an avoided capability cannot be selected.

Restriction mappings are frozen code-to-demand exclusions. Active exercises
must have approved safety metadata, and their exclusion list is derived from
their demand tags. A matching `requiresClearanceTags` entry also fails closed
with `CLEARANCE_REQUIRED`; catalog v1 has no positive-clearance input that
could authorize the exercise. Substitutions may only reference active
exercises in the same equivalence class and movement pattern. They are
metadata for later re-filtering, never permission to bypass equipment,
experience, or safety constraints.

Prescription classes freeze supported measurement and progression modes.
Starting resistance is explicitly unset; neither historical performance nor
catalog metadata fabricates an initial load.

The catalog semantic digest includes executable identities and aliases,
equipment, restrictions, prescriptions, executable exercise metadata, and
substitution rules. It excludes the digest field itself and presentation-only
`canonicalName`; names are checked against the canonical reference fixture but
are not executable lookup keys. The validator closes every nested runtime
shape, enforces canonical ordering and frozen policy sets, resolves all
references, validates substitution compatibility, and recomputes the digest.

`resolveCatalogCandidates` is a bounded compatibility resolver. It returns
deterministic compatible IDs, structured candidate rejection reasons, or
`unavailable`, `invalid_catalog`, or `invalid_request`. It does not rank
exercises, build sessions, prescribe volume, or generate a routine.

Fixtures 1, 2, 3, 4, 5, 8, and 10 provide bounded catalog evidence. Supported
movement patterns return exact candidates; deliberately unsupported coverage
such as travel vertical pulling or pull-up priority without pull equipment
returns structured infeasibility. The no-overhead fixture proves that a
restriction removes vertical-push candidates without substitutions bypassing
the same filter. Fixture 6 separately pins fail-closed `invalid_request` for
its free-text `rower` capability, which catalog v1 does not silently widen or
ignore.

## Coverage compiler v1

`src/features/curated-onboarding/planning/coverage/` defines the source-only
`fitness.planning-coverage.v1` boundary. It is the first consumer of both
merged contracts:

- planning intake: `fitness.planning-intake.v1`;
- exercise catalog: `fitness.exercise-catalog.v1`;
- compiler: `fitness.planning-coverage-compiler.2026-07-28.v1`;
- policy: `fitness.planning-coverage-policy.2026-07-28.v1`.

The compiler validates both complete inputs before reading executable fields.
It returns exactly one of:

| Status | Meaning | Executable schedule/requirements |
| --- | --- | --- |
| `ready` | Every required coverage item has at least one compatible candidate | Present |
| `infeasible` | Valid hard constraints leave required coverage or weekly frequency unsatisfied | Present with stable issues |
| `needs_clarification` | Required planning truth is absent or cannot be mapped without guessing | Absent |
| `blocked` | Planning or safety state is blocking/ambiguous | Absent |
| `invalid_input` | An input contract, digest, version, or cross-contract equipment ID is invalid | Absent |

Only `ready` and `infeasible` results expose compiled state. Their schedule
retains exact fixed weekdays or count-only semantics and the target/hard
session duration. Their hard-constraint record retains exact available and
avoided equipment, maximum dumbbell load, movement restrictions, and resolved
excluded/uncomfortable exercise IDs. Hard exercise names resolve only through
catalog exercise IDs or executable aliases. Presentation-only canonical names
and fuzzy free-text matching cannot create or remove a hard exclusion.

Coverage policy is frozen and closed:

- the four catalog goal codes compile into balanced movement-pattern
  requirements;
- recognized ranked secondary goals may add requirements or be explicitly
  classified as adherence/context goals with no physical coverage;
- target areas and the ten questionnaire movement-skill options use explicit
  pattern mappings;
- primary cardio requires two weekly occurrences and supporting cardio one;
- multiple sources for the same selector are preserved on one deduplicated
  requirement;
- unknown primary/secondary goals, target areas, movement skills, required
  exercise semantics, or hard exercise names return clarification.

Candidate pools come only from `resolveCatalogCandidates`. The compiler unions
the result for an explicit any-of movement selector, then removes resolved hard
exercise exclusions. It never widens equipment, treats an avoided capability
as available, bypasses restriction or clearance tags, or lets a narrower
equipment set add a candidate. An empty required pool produces
`REQUIRED_COVERAGE_UNAVAILABLE`; a minimum frequency above the known weekly
day count produces `WEEKLY_FREQUENCY_UNAVAILABLE`.

`coverageDigest` binds compiler/policy versions, both input semantic digests,
schedule and hard constraints, source-ranked coverage requirements, candidate
pools, issues, and terminal status.

`COVERAGE_COMPILATION_V1_STRUCTURAL_SCHEMA` is deliberately limited to
closed transport shape and JSON-Schema-expressible invariants. It is not a
semantic validity contract: portable JSON Schema cannot express every
canonical ordering, cross-array relationship, numeric comparison, or digest
recomputation required here. Schema-only acceptance must never authorize
planning.

Every consumer must obtain a successful receipt from
`validateCoverageCompilationV1WithReceipt`, pinned to
`fitness.planning-coverage-validator.2026-07-28.v1`. The runtime validator
closes the shape, freezes issue code/class/path meaning, enforces canonical
ordering plus schedule and status invariants, and recomputes the semantic
digest. The structural schema mirrors schedule-mode and issue/status policy
where JSON Schema can do so; the focused adversarial matrix executes both
boundaries and proves that runtime-only semantic contradictions fail closed.
Because a self-digest is consistency, not authorization, consumers with the
two inputs must additionally call
`validateCoverageCompilationAgainstInputsV1`; it first requires the versioned
runtime receipt, then recompiles and rejects a re-signed forged candidate
pool.

The runtime receipt also fails closed on malformed issue arrays and requirement
candidate arrays without throwing. Infeasibility issues must correspond to
executable facts:
`REQUIRED_COVERAGE_UNAVAILABLE` entries exactly cover requirements with no
compatible candidates, and `WEEKLY_FREQUENCY_UNAVAILABLE` entries exactly
cover requirements whose minimum exceeds the available weekly day count. A
caller cannot manufacture a valid stop-planning receipt by changing only the
status and re-signing a false infeasibility issue.

The digest is not a routine, plan-creation idempotency key, persistence proof,
or activation token. Coverage v1 does not rank candidates, assign them to
sessions, prescribe sets/reps/load/progression, generate a routine, persist
data, or change production onboarding behavior. Those remain separately
versioned and governed packets.

The ten normalized fixtures pin all terminal classes needed by this boundary:
five compile ready, bodyweight travel and pull-up-without-pull-equipment return
structured infeasibility, the unsupported `rower` fixture is invalid, the
ambiguous warning fixture is blocked, and the free-text `overhead press`
exclusion requests clarification because it is not an executable catalog
alias. `.github/workflows/planning-coverage-contract.yml` executes the focused
suite directly at each relevant exact head. Its path filters cover the full
`curated-onboarding/**` dependency tree, so changes to questionnaire/types,
normalized intake, semantic projection, fixtures, catalog, or coverage cannot
bypass this consumer contract. It does not modify the open
`.github/workflows/ci.yml` lane.

## Candidate ranking v1

`src/features/curated-onboarding/planning/ranking/` defines the source-only
`fitness.candidate-ranking.v1` boundary. It consumes three exact inputs:

- a runtime-valid normalized planning intake;
- a runtime-valid exercise catalog;
- a runtime-valid, input-bound coverage compilation.

The compiler refuses to score unless the coverage result is `ready`.
`blocked`, `needs_clarification`, `infeasible`, and coverage-level
`invalid_input` results become a digest-bound `not_rankable` terminal with no
candidate output. Malformed or input-mismatched contracts become
`invalid_input`. Ranking never treats a non-ready result as an empty or
lower-confidence plan.

Every compatible exercise ID from every coverage requirement appears exactly
once in the ranking output. No candidate can be added, removed, or widened by
the scorer. Eligibility remains owned by coverage and the catalog's equipment,
experience, restriction, clearance, and explicit hard-exclusion filters.

Ranking uses seven closed integer components:

| Component | Source | Rule |
| --- | --- | --- |
| `goalFit` | Catalog goal tier for the primary goal | Lower reviewed tier scores higher |
| `planStyleFit` | Normalized plan style and catalog style tags | Exact match, mismatch, or neutral no-preference |
| `preference` | Exact executable ID/alias matches from preferred/disliked names | Preferred, disliked, conflict-neutral, or neutral |
| `experienceSuitability` | Validated experience and catalog suitability | Beginner preference or exact/minimum experience relation |
| `timeEfficiency` | Catalog time-efficiency tier | Lower reviewed tier scores higher |
| `setupTransitionCost` | Catalog setup plus transition seconds | Closed low/moderate/high bands |
| `recoveryCost` | Normalized recovery modifier and systemic-fatigue tier | Standard is neutral; conservative scoring rewards or penalizes the reviewed fatigue tier |

Each component has exactly one immutable reason code in component order.
`CANDIDATE_RANKING_REASON_POLICY` freezes every reason-to-component and
reason-to-score mapping. Runtime validation rejects missing, duplicated,
reordered, or mismatched reasons, non-integer components, incorrect totals,
duplicate candidate IDs, and noncanonical ranking order.

Preference lookup is executable and presentation-neutral: it uses exercise IDs
and validated aliases after deterministic text normalization. It does not use
`canonicalName`, fuzzy matching, raw questionnaire IDs, nutrition, delivery
preferences, acknowledgments, or historical lift text. Unresolved optional
preference names are neutral. If the same exact exercise is both preferred and
disliked, that component is conflict-neutral rather than caller-order
dependent.

Ordering is frozen:

1. total score descending;
2. catalog `curatedRank` ascending;
3. exercise ID lexical ascending.

`rankingDigest` binds schema/compiler/policy versions, all three input semantic
digests and coverage status, requirement IDs, candidate IDs, all score
components, reason codes, totals, curated ranks, issues, status, and final
order.

There is deliberately no exported JSON Schema presented as semantic
authorization. Consumers must require a successful receipt from
`validateCandidateRankingV1WithReceipt`, pinned to
`fitness.candidate-ranking-validator.2026-07-28.v1`. That runtime boundary
closes record shapes, authenticates score/reason semantics, enforces status and
ordering invariants, recomputes the digest, and returns errors instead of
throwing on malformed transport members.

A self-consistent digest still does not prove source authenticity. Consumers
with the three inputs must additionally call
`validateCandidateRankingAgainstInputsV1`; it first requires the versioned
runtime receipt, then recompiles from the exact planning, catalog, and coverage
inputs. Re-signed candidate omission, injection, score drift, or a forged
coverage pool cannot cross that boundary.

The ten normalized fixtures pin five `ready` ranking results and five
`not_rankable` terminals. The focused suite additionally covers deterministic
repeatability, both tie-breakers, preference monotonicity and conflicts,
conservative recovery behavior, presentation-only catalog changes, score and
reason tampering, digest/order tampering, malformed transports, and
input-bound candidate omission/injection.
`.github/workflows/planning-ranking-contract.yml` runs that suite directly and
watches the complete `curated-onboarding/**` dependency tree plus both contract
documents and its own workflow. It does not modify or depend on the open
`.github/workflows/ci.yml` lane.

Ranking v1 does not choose a global exercise set, allocate exercises to
sessions, prescribe sets/reps/load/progression, generate a routine, persist
data, activate anything, or change current onboarding or existing-routine
behavior. Those remain later separately versioned and governed packets.

## Global Candidate Selection v1

`src/features/curated-onboarding/planning/selection/` defines the source-only
`fitness.global-selection.v1` boundary. It consumes four exact inputs:

- a runtime-valid normalized planning intake;
- a runtime-valid exercise catalog;
- a runtime-valid, input-bound coverage compilation;
- a runtime-valid, input-bound candidate ranking.

Selection refuses to run unless all four inputs validate and both derived
contracts recompile from their exact upstream inputs. A non-ready ranking
becomes a digest-bound `not_selectable` terminal. Malformed, self-consistent
but input-mismatched, or version-mismatched inputs become `invalid_input`.

For a ready ranking, Global Selection v1 chooses exactly one candidate for
every canonical coverage requirement and prohibits reusing an exercise across
requirements. Coverage remains the sole eligibility authority, and ranking
remains the sole candidate-order and score authority. Selection cannot inject,
remove, rescore, or widen a candidate pool.

The global objective is closed:

1. maximize the sum of selected candidate scores;
2. for equal totals, traverse requirements by canonical requirement ID and
   prefer each requirement's existing ranking order;
3. preserve the chosen ranking position, candidate score, and curated rank as
   digest-bound evidence.

This prevents a locally greedy first choice from consuming a shared exercise
when a different assignment has the larger total score. If no perfect
globally unique assignment exists, the compiler returns `infeasible` with
`UNIQUE_ASSIGNMENT_UNAVAILABLE`. The memoized search is capped at 100,000
states; reaching that bound fails closed with
`SELECTION_SEARCH_LIMIT_EXCEEDED` instead of returning a partial assignment.

`selectionDigest` binds all schema/compiler/policy versions, the planning,
catalog, coverage, and ranking semantic identities and statuses, every selected
requirement/exercise pair, ranking positions, candidate scores, curated ranks,
the total objective, its tie-break vector, issues, status, and canonical order.

There is deliberately no exported JSON Schema presented as semantic
authorization. Consumers must require a successful receipt from
`validateGlobalSelectionV1WithReceipt`, pinned to
`fitness.global-selection-validator.2026-07-28.v1`. The runtime boundary closes
all record shapes, issue code/class/path semantics, global exercise uniqueness,
objective arithmetic, status rules, canonical order, and digest recomputation,
and it returns errors instead of throwing on malformed members.

A runtime-valid self-digest still cannot prove candidate ownership or complete
requirement coverage. Consumers with the four inputs must additionally call
`validateGlobalSelectionAgainstInputsV1`. It first requires the versioned
runtime receipt, then recompiles from the exact planning, catalog, coverage,
and ranking inputs. Re-signed selection omission, injection, input-identity
forgery, or altered assignment cannot cross that boundary.

The ten normalized fixtures pin five `selected` results and five
`not_selectable` terminals. The focused suite also proves deterministic
repeatability, global-score optimization, canonical equal-score resolution,
unique-assignment infeasibility, coverage/ranking ownership, issue
authenticity, digest/order/objective tampering, malformed non-throwing
receipts, and input-bound omission/injection rejection.
`.github/workflows/planning-selection-contract.yml` runs that suite directly
and watches the complete `curated-onboarding/**` dependency tree plus both
contract documents and its own workflow. It does not modify or depend on the
open `.github/workflows/ci.yml` lane.

Global Selection v1 does not allocate exercises to sessions, prescribe
sets/reps/load/progression, generate a routine, persist data, activate
anything, or change current onboarding or existing-routine behavior. Those
remain later separately versioned and governed packets.

## Session Allocation v1

`src/features/curated-onboarding/planning/allocation/` defines the source-only
`fitness.session-allocation.v1` boundary. It consumes the five exact inputs
already established by the planning chain:

- a runtime-valid normalized planning intake;
- a runtime-valid exercise catalog;
- a runtime-valid, input-bound coverage compilation;
- a runtime-valid, input-bound candidate ranking;
- a runtime-valid, input-bound global selection.

Allocation revalidates every contract and recompiles Coverage, Ranking, and
Selection from their exact upstream inputs before it may place an exercise.
Malformed or input-mismatched state becomes `invalid_input`. Any selection
terminal other than `selected` becomes `not_allocatable`; no partial sessions
are emitted.

For a selected input, Allocation v1 preserves the exact requirement/exercise
set and assigns every selection exactly once across the requested session
slots. Fixed schedules retain their exact canonical weekdays. Count-only
schedules retain their requested session count and emit `null` weekday slots
without inventing dates. Selected exercises are traversed in canonical
selection order and distributed round-robin, producing non-empty session
counts whose maximum spread is one. If the requested session count exceeds
the exact selected exercise count, allocation fails closed as `infeasible`
with `SESSION_COUNT_EXCEEDS_SELECTIONS` instead of emitting empty workout days.
The executable invariant is exact: zero-based session index must equal
`(selectionPosition - 1) % sessionCount`; a digest-consistent cross-session
swap is runtime-invalid even when global positions, uniqueness, and objective
arithmetic still look coherent.

Each assignment binds the coverage requirement ID, exercise ID, original
selection position, and its position within the session. The objective binds
the session count, exercise count, per-session counts, minimum, maximum, and
spread. `allocationDigest` authenticates all versions and upstream identities,
the exact schedule, every assignment, the balancing objective, issues,
terminal status, and canonical order.

There is no portable JSON Schema presented as semantic authorization.
Consumers must require
`validateSessionAllocationV1WithReceipt`, pinned to
`fitness.session-allocation-validator.2026-07-29.v1`. The runtime receipt
closes record shapes, issue policy, schedule modes, assignment uniqueness,
session/order arithmetic, objective arithmetic, status rules, and digest
recomputation without throwing on malformed members. Consumers with all five
inputs must additionally call `validateSessionAllocationAgainstInputsV1`;
runtime-valid re-signed assignment substitution still fails exact-input
recompilation.

The ten inherited planning fixtures pin five `allocated` results and five
`not_allocatable` terminals. The focused suite also proves fixed and
count-only schedule behavior, deterministic balance, exact selected-set
preservation, malformed non-throwing receipts, digest/order tampering,
re-signed assignment rejection, forged-selection rejection, infeasible
seven-day allocation, repeatability, and direct workflow coverage.
`.github/workflows/planning-session-allocation-contract.yml` watches the
complete `curated-onboarding/**` dependency tree and runs the focused suite
directly.

Session Allocation v1 does not prescribe sets, reps, load, rest, tempo, or
progression; generate routine persistence records; activate a routine; or
change current onboarding or existing-routine behavior. Those remain later
separately versioned and governed packets.

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

The required pull-request CI workflow runs the focused planning-contract and
exercise-catalog test files directly in addition to the legacy curated engine
and roadmap suites.

## Runtime authenticity and invariants

`validateNormalizedPlanningIntakeV1` closes every normalized record and array
item shape, validates issue/ranked-value/provenance semantics, and enforces:

- each issue code has one immutable severity and a closed path policy; general
  response issues use the exact questionnaire-to-contract response-path
  allowlist, while derived schedule/safety policies use exact paths or a
  safety-path family;
- fixed weekday count equals the requested weekly count;
- `fixed` means exact weekdays plus no flexibility, `count_only` means a
  non-null day count plus no weekdays and any-day flexibility, and `unknown`
  means a null day count, no weekdays, and unknown flexibility;
- session target and hard maximum are present or absent together;
- session target never exceeds the hard maximum;
- safety cannot be `clear` while restrictions, warnings, or unresolved
  blocking safety issues remain;
- free-form pain or limitation details remain ambiguous and blocking until a
  future structured scope answer can establish restriction semantics; keyword
  matches never manufacture a movement restriction from that text;
- dumbbell limits require explicit load units, ignore explicitly labeled
  total/combined loads across clause and word-order forms, and remain null when
  the source cannot establish a per-dumbbell maximum;
- warning flags always carry the canonical blocking clearance issue;
- `not_cleared` or unresolved professional direction is plan-blocking, while
  professional restriction codes must exist in movement restrictions;
- scoped `restricted` state has at least one explicit restriction;
- safety unresolved issues are blocking safety entries also present in the
  canonical normalization issue list;
- `constraintClasses.blockingIssueCodes` exactly matches the blocking issue
  set;
- hard, required-coverage, optimization, and context-only path classes equal
  their frozen versioned sets in exact order and are mutually disjoint, so a
  caller cannot demote safety, schedule, duration, or equipment constraints;
- `generationProjectionDigest` recomputes from and authenticates the semantic
  projection.

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

The coverage compiler consumes only the validated normalized contract and
validated exercise catalog, not raw questionnaire IDs. Ranking consumes only
runtime-valid, input-bound coverage. Global selection consumes only the
runtime-valid, input-bound ranking and its exact upstream inputs. Session
allocation revalidates all five inputs, preserves coverage eligibility and the
exact selected set, and refuses `blocked`, `needs_clarification`,
`not_rankable`, `not_selectable`, `not_allocatable`, `invalid_input`, or
`infeasible` results.

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
