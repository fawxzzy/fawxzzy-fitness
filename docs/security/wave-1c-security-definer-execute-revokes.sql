-- DRAFT ONLY. DO NOT APPLY FROM THIS FILE.
-- Purpose: outline the narrowest Wave 1C remediation for the remaining
-- SECURITY DEFINER exposure findings without changing function behavior.
--
-- Expected production migration shape:
-- 1. keep both functions in place
-- 2. keep SECURITY DEFINER unless follow-up proof justifies changing it
-- 3. revoke EXECUTE from public, anon, and authenticated
-- 4. refresh security advisors and confirm the two exposure classes clear

revoke execute on function public.assign_real_user_number_on_profile_insert() from public;
revoke execute on function public.assign_real_user_number_on_profile_insert() from anon;
revoke execute on function public.assign_real_user_number_on_profile_insert() from authenticated;

revoke execute on function public.is_automation_auth_user(uuid) from public;
revoke execute on function public.is_automation_auth_user(uuid) from anon;
revoke execute on function public.is_automation_auth_user(uuid) from authenticated;

-- Verification after a real migration apply:
-- - advisors.security:
--   - anon_security_definer_function_executable -> cleared
--   - authenticated_security_definer_function_executable -> cleared
-- - smoke check:
--   - profile insert path still assigns user numbers correctly
--   - automation-account classification still works
--
-- Rollback concern:
-- - if an undocumented RPC consumer exists, EXECUTE revocation will break it.
