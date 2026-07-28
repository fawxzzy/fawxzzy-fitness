# Curated routine generation contract

## Current source packet

The first deterministic routine-generation packet converts the existing curated
onboarding answers into `fawxzzy-fitness.curated-planning.v1`.

The normalized contract is the boundary between questionnaire storage and
exercise/program selection. It does not add another questionnaire batch and it
does not change database, provider, authentication, or production state.

## Contract guarantees

- The same planning-relevant answers produce the same canonical SHA-256 digest.
- Contact and display identity are not part of the planning digest.
- Exact selected weekdays are preserved when their count matches the requested
  training frequency.
- `Flexible` and exact weekday selections cannot be combined silently.
- A weekday-count mismatch blocks generation instead of discarding a choice.
- Explicit available-equipment answers outrank broad location-derived access.
  For example, Planet Fitness plus machines and dumbbells does not imply free
  barbell access.
- Warning symptoms, incomplete safety answers, missing guardian authority,
  unresolved medical or medication context, missing restriction detail, and
  missing safety acknowledgments fail closed before exercise selection.
- Nutrition and delivery answers remain plan context. They do not influence
  exercise safety or selection.
- The generated plan carries the planning contract version, algorithm version,
  SHA-256 digest, and current catalog version.

## Golden fixture

`beginner-planet-fitness-4day-muscle-gain` is the first anonymized fixture.

This packet proves:

- Tuesday, Thursday, Saturday, and Sunday workout placement;
- Monday, Wednesday, and Friday rest placement;
- beginner double-progression targets with no invented starting loads;
- machine, dumbbell, and bodyweight access without inferred free-barbell access;
- stable planning and plan identity;
- fail-closed behavior before selection when explicit safety blockers exist.

The fixture does not yet claim the final approximately 24-exercise acceptance
target. That requires the next catalog and coverage-ledger packet.

## Next source packets

1. Replace the legacy static candidates with a versioned structured exercise
   catalog and substitution groups.
2. Build an explicit weekly coverage ledger for goals, movement patterns,
   target areas, time/volume, recovery spacing, and unmet explanations.
3. Persist planning provenance, substitutions, warm-up, progression, and plan
   context through the existing failure-safe creation and activation boundary.
