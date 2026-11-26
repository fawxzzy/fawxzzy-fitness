-- Routine Archive v1 (2026-11-26).
-- Routines are archived instead of deleted, so the workouts logged with them stay in History.
-- Additive only: one nullable column, no default rewrite, no backfill, no grant or policy change.
-- Existing reads and writes keep working unchanged (the column is optional everywhere), so this
-- can be applied before the application change that uses it.
-- The master `fitness` schema twin is supabase/master-fitness/20261126000000_routine_archive_fitness_v1.sql.

alter table public.routines
  add column if not exists archived_at timestamptz null;

comment on column public.routines.archived_at is
  'Set when the member archives the routine (hidden from lists and pickers; its sessions stay in History). NULL = listed. Restore sets it back to NULL.';
