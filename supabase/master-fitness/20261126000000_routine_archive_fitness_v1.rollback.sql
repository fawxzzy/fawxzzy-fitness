-- ROLLBACK for the routine archive apply (master `fitness` schema).
-- Removes only the column the apply added. Every archived routine becomes a
-- listed routine again (nothing is deleted: routines, days and sessions stay).
-- Run this only if the apply must be reverted. If the application change that
-- archives routines is deployed, roll that deployment back FIRST. (The app
-- also tolerates the column being absent: src/lib/routine-archive.ts.)
begin;
alter table fitness.routines drop column if exists archived_at;
notify pgrst, 'reload schema';
commit;
