# Fitness Legacy Migration Plan

## Goal

Ship the new Supabase backend behind the same Fitness app and the same production URL, with one migration window where the app can still read old user data before the production cutover is finalized.

## Current State

As of 2026-04-16, the linked replacement project is `lpswxoyfniocuhljgzbc`.

- The exercise seed replay fix is in the repo.
- Remote history repair was required because the old remote `022` and `030` entries conflicted with newer local files that had reused those version numbers.
- The replay-safe local chain now uses unique follow-on versions for those collisions:
  - `0221_routine_day_exercise_cardio_targets.sql`
  - `0222_profile_unit_preferences.sql`
  - `0301_session_exercises_target_sets_range_columns.sql`
  - `0302_backfill_session_exercises_exercise_id.sql`

## Release Model

### Release A: migration-enabled, old backend primary

- Keep the old Supabase project as the primary auth and data backend.
- Add a read-only legacy export bridge inside the app.
- Add the new-backend importer and migration receipts in parallel.
- Exercise the bridge against real user data before any primary env flip.

### Release B: new backend primary, legacy bridge retained

- Flip the app's primary Supabase envs to the new project.
- Keep the legacy bridge available as a read-only fallback during the grace window.
- Allow remaining users with still-valid old sessions to pull their data forward inside the same app.
- Run admin bulk backfill if old privileged credentials are recovered in time.

### Release C: cleanup

- Remove the legacy bridge only after the migration window closes.
- Confirm migration receipts and operator metrics before deleting bridge code.
- Recompute derived state in the new backend rather than importing it from legacy.

## Canonical Snapshot Contract

The canonical payload lives in [fitness-legacy-contract.ts](/C:/ATLAS/repos/fawxzzy-fitness/src/lib/migration/fitness-legacy-contract.ts) and is the only supported exporter/importer contract.

Canonical tables:

- `profiles`
- `exercises`
- `routines`
- `routine_days`
- `routine_day_exercises`
- `sessions`
- `session_exercises`
- `sets`

Explicitly excluded from canonical export:

- `exercise_stats`
- `session_follow_up_jobs`

Contract rules:

- Capture user identity metadata separately from table rows.
- Preserve legacy IDs for every canonical entity so the importer can build explicit old-to-new mappings.
- Keep relationship fields in terms of legacy IDs inside the payload.
- Do not infer import behavior from raw vendor tables at import time.
- Recompute derived data after import instead of treating it as source-of-truth payload.

## Migration Authoring Caveat

Expression-based or partial unique indexes are not valid plain-column `ON CONFLICT` targets. Replayable seed migrations must use a normalized `WHERE NOT EXISTS` pattern or target a real named unique constraint that exactly matches the uniqueness rule.

This matters for the exercises seed path because the uniqueness rule is based on normalized names, not raw `name`.

## Remote Migration Repair

Use the linked project from the repo root:

```bash
npx supabase migration list --linked
npx supabase migration repair 022 --status reverted --linked
npx supabase migration repair 030 --status reverted --linked
npx supabase db push --include-all --linked
```

If the linked shell also has `SUPABASE_DB_PASSWORD` set, finish with:

```bash
npx supabase db push --dry-run --linked
```

Expected outcome:

- `migration repair` clears the old remote-only `022` and `030` history rows.
- `db push --include-all --linked` inserts the renumbered local migrations even though they sort before the latest already-applied remote versions.
- `db push --dry-run --linked` comes back clean once the local filenames and remote history no longer drift.

Repo shortcut:

```bash
npm run migration:validate
```

That script checks `migration list`, then runs `db push --dry-run --linked` only when the history table is already clean. If `SUPABASE_DB_PASSWORD` is missing, it reports that exact blocker instead of hiding it.

## Project-Level Supabase Setup

### Environment variables

These must point at the new project before the app cutover:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The auth actions also derive email confirmation and reset links from:

- `NEXT_PUBLIC_APP_URL`, or
- `APP_URL`

### Auth dashboard configuration

The repo currently uses email/password auth plus email confirmation and password reset flows. There is no repo evidence of social-login providers or custom storage-backed auth flows.

Set the Supabase Auth URL configuration to:

- Site URL: the production app origin
- Additional Redirect URLs:
  - `http://localhost:3000/**`
  - `https://*-<team-or-account-slug>.vercel.app/**`

If you customize Supabase email templates and you pass `redirectTo` from the app, use `{{ .RedirectTo }}` in the template link path instead of hard-coding `{{ .SiteURL }}`.

If auth users are copied into the new project and you want old signed-in sessions to stay valid, reuse the old JWT secret before cutover. If the new project keeps a different JWT secret, every user will need to sign in again after the switch.

### Storage reality

This repo stores exercise media as string paths on `public.exercises`. It does not create Supabase Storage buckets or Storage policies in the migration chain, and the app code does not call the Storage API for migration signoff.

That means there is no additional Storage dashboard setup required for the current database cutover unless real uploaded media is introduced later.

## Canonical Signoff Rules

Hard signoff counts:

- `profiles`
- `user_owned_exercises`
- `routines`
- `routine_days`
- `routine_day_exercises`
- `sessions`
- `session_exercises`
- `sets`

Not hard blockers:

- `exercise_stats`
- `session_follow_up_jobs`

Global exercise rows are not a UUID-parity requirement. If you need to audit them, compare by `normalized_name`.

## Validation Harness

### CLI

Schema readiness:

```bash
npm run migration:validate
npm run verify
```

Per-user parity report:

```bash
npm run migration:parity -- --user-id <new-project-user-id> --snapshot <path-to-exported-snapshot.json>
```

### Preview parity route

While signed in as the migrated user on preview or local dev, POST the canonical snapshot to:

```text
/api/migration/parity
```

Request body:

```json
{
  "snapshot": { "metadata": { "snapshot_version": "fitness-legacy-v1" } }
}
```

The route returns canonical signoff counts for the authenticated new-project user, excludes derived tables from hard failure, and keeps the same canonical contract reusable for a future non-Supabase importer.

## Preview-To-Prod Checklist

1. Run `npm run migration:validate`.
2. Run `npm run verify`.
3. Confirm the new project env vars are set locally and in Vercel preview and production.
4. Confirm Supabase Site URL and Redirect URLs match production, localhost, and Vercel preview coverage.
5. Run the parity report for at least one migrated user.
6. Smoke-test `/today`, `/routines`, `/history`, `/settings`, session start, session resume, and session detail on preview.
7. Flip production only after schema readiness, parity counts, and preview auth flows all pass.

## Operational Rules

- Legacy access is additive. Do not replace the primary client until Release B.
- Old authenticated sessions are the safest user-scoped migration seam when old privileged credentials are unavailable.
- Admin bulk backfill is optional and dormant until old service-role or database credentials are recovered.
- Rollback is release-based, not ad hoc. Each release keeps a valid fallback path.
