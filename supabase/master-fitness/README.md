# Master `fitness` schema apply packages

Hand-applied SQL for the shared master Supabase project, where the Fitness
tables live in schema `fitness`. These files are deliberately **not** in
`supabase/migrations/`: that chain builds the legacy single-schema layout and is
replayed by CI, so a `fitness.*` statement there would fail a clean replay.

Nothing here is applied by merging a PR. Each package needs the exact sha256 of
its apply file to be approved, then a manual apply (`sb-query.ps1 -Write
-ApprovedSha256 <sha>` through the atlas-supabase skill).

## 20261106000000_session_start_atomicity_fitness_v1

Adds `fitness.sessions_user_routine_active_uq` (partial unique index: one
in-progress session per user and routine) and `fitness.start_session_from_day_v1`
(service-role-only atomic session start; the corrected 20260811043408 body
retargeted to `fitness.*`).

Files: `.sql` (apply), `.preimage.sql` and `.readback.sql` (read-only),
`.rollback.sql` (drops only the function and the index).

Order of operations:

1. Run the preimage. Require `idx_present = 0`, `fn_present = 0`,
   `dup_user_routine_groups = 0`, `auth_role_fn_present = 1`.
2. Approve the apply file hash; apply it (one transaction; aborts untouched if a
   duplicate active session appeared meanwhile).
3. Run the readback; require the index and function present, function ACL
   `{postgres=X/postgres,service_role=X/postgres}`, `search_path=""`.
4. Only then merge and deploy the application change that calls the function.

Rollback: if the app change is deployed, roll the deployment back first, then run
the `.rollback.sql` file. Without the function the app's session start fails
loudly by design (no fallback to direct inserts).

## 20261126000000_routine_archive_fitness_v1

Adds the nullable column `fitness.routines.archived_at timestamptz` (routines
are archived instead of deleted; restoring sets it back to NULL). Additive only:
no default, backfill, index, grant or policy change. Repo-chain twin:
`supabase/migrations/20261126000000_routine_archive_v1.sql`.

Files: `.sql` (apply), `.preimage.sql` and `.readback.sql` (read-only),
`.rollback.sql` (drops only the column).

Order of operations:

1. Run the preimage. Require `routines_table_present = 1`, `column_present = 0`.
2. Approve the apply file hash; apply it (one transaction, idempotent).
3. Run the readback; require `column_present = 1`, `data_type = timestamp with
   time zone`, `is_nullable = YES`, `column_default` null, `archived_total = 0`,
   and `routines_total` / `routines_policy_count` equal to the preimage.
4. Then merge and deploy the application change. Old code never names the
   column, so applying first is safe; the new code also runs without the column
   (it hides Archive until the column exists, see `src/lib/routine-archive.ts`).

Rollback: roll the deployment back first if archived routines must stay hidden,
then run `.rollback.sql`. Dropping the column lists every archived routine again;
no routine, day or session is deleted.
