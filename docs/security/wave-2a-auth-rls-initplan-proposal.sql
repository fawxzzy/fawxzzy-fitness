-- Proposal only: do not apply directly.
-- Wave 2A-1 mechanical rewrite pattern for auth_rls_initplan findings.
--
-- Rule:
-- - preserve policy names and access intent
-- - replace direct auth.uid() calls with (select auth.uid())
-- - keep non-auth predicates unchanged

-- Example session-core rewrites:

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions
for select
using (user_id = (select auth.uid()));

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions
for insert
with check (user_id = (select auth.uid()));

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions
for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
on public.sessions
for delete
using (user_id = (select auth.uid()));

-- Apply the same mechanical substitution to:
-- - session_exercises_*_own
-- - sets_*_own
-- in the first implementation batch only.
