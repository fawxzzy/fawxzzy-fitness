-- Routine Archive v1 -- MASTER `fitness` schema apply package.
--
-- NOT part of the supabase/migrations replay chain (that chain builds the
-- legacy single-schema layout; its twin is
-- supabase/migrations/20261126000000_routine_archive_v1.sql). See
-- supabase/master-fitness/README.md.
--
-- Properties:
--   * additive only: one nullable column, no default, no backfill, no index,
--     no grant or policy change (table-level grants and the existing
--     routines_update_own policy already cover the new column);
--   * single transaction: any failure leaves the database unchanged;
--   * idempotent: re-running changes nothing the second time;
--   * old application code keeps working (it never names the column), so this
--     is applied BEFORE the application change that archives routines.
-- Apply ONLY after the exact sha256 of this file is approved.

begin;

alter table fitness.routines
  add column if not exists archived_at timestamptz null;

comment on column fitness.routines.archived_at is
  'Set when the member archives the routine (hidden from lists and pickers; its sessions stay in History). NULL = listed. Restore sets it back to NULL.';

-- Ask PostgREST to pick up the new column now (delivered at commit).
notify pgrst, 'reload schema';

commit;
