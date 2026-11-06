-- ROLLBACK for the session-start atomicity apply (master `fitness` schema).
-- Removes only the objects the apply added. No table data is touched.
-- Run this only if the apply must be reverted. If the application code that
-- calls the function has already been merged and deployed, revert or roll back
-- that deployment FIRST, otherwise session start fails.
begin;
drop function if exists fitness.start_session_from_day_v1(
  uuid, uuid, uuid, text, text, jsonb
);
drop index if exists fitness.sessions_user_routine_active_uq;
commit;