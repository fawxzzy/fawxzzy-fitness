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