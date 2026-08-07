// A real Supabase project's Postgres is never actually "empty" when the
// repo's own supabase/migrations/*.sql chain starts running against it: the
// Supabase platform (hosted projects, `supabase start`'s local stack, and
// preview/development branches alike) provisions a fixed set of schemas,
// roles, and extensions ahead of time, before any project migration is
// applied. supabase/migrations/ has never needed to create that scaffolding
// itself, and it must not start doing so now -- adding a migration file that
// (re)creates `auth`, or the `anon`/`authenticated`/`service_role` roles,
// would be redundant at best and destructive at worst if it were ever pushed
// to the real linked project (ref lpswxoyfniocuhljgzbc), which already has
// all of this.
//
// That platform-provisioned baseline is exactly what a truly bare Postgres
// (including a fresh PGlite instance, which is what this repo's offline
// clean-database replay proof uses -- see replay-clean-chain.mjs) does not
// have. This module supplies only the minimal slice of that baseline that
// supabase/migrations/*.sql actually references, so the chain's own SQL can
// be verified for internal consistency without contacting any real Supabase
// project. It intentionally does not attempt to be a full reimplementation
// of Supabase's auth/storage/realtime stack.
//
// The exact minimal surface below was determined by grepping every file in
// supabase/migrations/ for cross-schema and role references (see the
// migration-chain-clean-replay PR description for the full command output):
//   - `auth.uid()` and `auth.role()` -- used throughout RLS policies and
//     SECURITY DEFINER functions.
//   - `auth.users` -- referenced only via `references auth.users(id)`
//     foreign keys, and via `u.id` / `u.email` / `u.raw_app_meta_data` /
//     `u.raw_user_meta_data` reads inside
//     `public.is_automation_auth_user()`. No other auth.users column is
//     read anywhere in the chain.
//   - Postgres roles `anon`, `authenticated`, `service_role` -- targets of
//     `grant`/`revoke` statements starting at
//     20260506190000_048_security_definer_execute_revokes.sql.
//   - The `pgcrypto` extension -- `create extension if not exists pgcrypto;`
//     in 001_init.sql (Supabase projects ship with pgcrypto available;
//     PGlite needs it loaded explicitly via its contrib bundle).
//
// Nothing here is applied to, or ever should be applied to, a real Supabase
// project -- it exists solely to stand in for platform scaffolding inside a
// disposable, in-process PGlite database.

export const SUPABASE_PLATFORM_PREAMBLE_SQL = `
create role anon;
create role authenticated;
create role service_role;

create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select null::text;
$$;
`;

/**
 * Applies the minimal Supabase-platform-provisioned baseline (schemas,
 * roles, stub auth functions) to a database connection that otherwise has
 * nothing in it. Must run before any file from supabase/migrations/ is
 * applied.
 *
 * @param {{ exec(sql: string): Promise<unknown> }} db
 */
export async function applySupabasePlatformPreamble(db) {
  await db.exec(SUPABASE_PLATFORM_PREAMBLE_SQL);
}
