# Supabase Migration Drift Follow-Up

## Why this exists

`npm run migration:validate` currently reports migration history drift:

- local `038_fix_strength_exercise_measurement_labels.sql`
- remote `<missing>`

The `Stretch` release was kept live because production behavior and data were validated directly, but migration parity should not be treated as healthy until this is resolved.

## Constraints

- Do not alter production data casually.
- Do not rewrite migration history blindly.
- Do not assume missing remote history means the schema is missing the underlying change.

## Required investigation

1. Determine why local migration `038` is missing remotely.
2. Check whether `038` was:
   - intentionally skipped
   - manually applied outside the migration chain
   - renamed/replaced by another migration
   - lost from remote migration history
3. Compare production schema/data state against the intended effect of `038`.

## Resolution options

Choose exactly one path after the investigation:

1. If production already matches `038` semantically:
   - repair or document migration history safely
   - restore parity without replaying a data mutation that already happened

2. If production does not match `038`:
   - create a safe forward migration
   - bring production into parity explicitly
   - re-run migration validation after the forward fix lands

## Exit criteria

- The cause of the missing remote `038` entry is documented.
- Production schema/data is confirmed to match the intended state.
- Migration history is repaired or a safe forward migration is added.
- `npm run migration:validate` no longer reports this drift.

## Release note

The Atlas / Stretch production release was validated independently of migration parity:

- `Stretch` exists as a global exercise
- active `Atlas` uses global `Stretch`
- rest days are empty
- non-rest days start with `Stretch` then `Treadmill Run`
- no `Stretch` history rows exist in completed workout logs
