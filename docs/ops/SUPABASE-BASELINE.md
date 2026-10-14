# Supabase Baseline

Fawxzzy Fitness keeps its local database contract in the repo so product work does not depend on untracked Supabase state.

## Checked-In Contract

- Schema migrations live in `supabase/migrations/**`.
- Deterministic local/dev seed data lives in `supabase/seed.sql`.
- Durable catalog inputs live in `supabase/data/**`.
- Runtime Supabase state, linked project metadata, local credentials, and generated CLI files are not part of the canonical contract.

The migration chain models existing Fitness persistence only: profiles, routines, routine days, routine day exercises, sessions, session exercises, sets, global exercises, exercise stats, and follow-up jobs. This baseline does not add monetization, dashboards, planner surfaces, production mutations, or live project linking.

## Local Reset

Use the Supabase CLI from the repo root:

```powershell
supabase db reset
```

The reset applies `supabase/migrations/**` and then `supabase/seed.sql`. The seed creates a local-only automation account and deterministic workout data for smoke-checking routine, session, logger, and history persistence:

- Email: `fitness-seed@example.test`
- Password: `fitness-local-password`

Those credentials are local fixture data only. They are not production credentials and must not be reused outside local/dev Supabase instances.

## Branch Preview Hygiene

- Branch previews should be created from checked-in migrations and deterministic seeds, not from hand-edited database state.
- Preview branches must not run `supabase db push` against production or any shared live project as part of this baseline flow.
- If a branch needs schema changes, add a migration first and keep the migration additive or explicitly documented.
- If seed data needs to change, update `supabase/seed.sql` with deterministic IDs and idempotent `insert ... on conflict` behavior.
- Keep live project refs, service role keys, database passwords, access tokens, and `.env*` values out of commits.

## Member classification authority

The forward migration `20261014175935_trust_server_metadata_for_member_classification.sql`
classifies new automation accounts only from the server-controlled Auth
`app_metadata.account_kind` value. Email naming patterns and user-editable
metadata are not authority. Historical migrations remain unchanged as provenance.

Existing profile kinds, member numbers, assignment timestamps and sequence state
are preserved. A legacy automation label without a server tag does not establish
that an account is human, disposable, or safe to reclassify. Changing those
existing records requires a separate provenance review.

The migration checks the existing classifier owner and grants before replacing
its body. An unexpected grantee, grantor or nonowner grant option stops the
transaction for review. The accepted baseline leaves direct execution with
`postgres` and `service_role` only; it does not silently remove unknown grants.

This checked-in baseline uses `public`; the consolidated master uses the
separately managed `fitness` schema. This source correction aligns the local
classifier rule with the accepted master rule. It does not deploy a migration,
move a table, or establish live master state.

CI runs `node --test scripts/migration/member-identity-authority.contract.test.mjs`
against disposable PGlite data. The tests cover trusted metadata, spoofed metadata,
email heuristics, missing identities, exact privileges, ACL drift rejection, function shadowing, allocator
integration, immutable identity and preservation on reapplication.

## No Secrets

Do not commit Supabase project credentials, service role keys, pooled database URLs, JWT secrets, or production user data. Local examples may use documented fixture credentials only when they are clearly non-secret and scoped to local reset data.

## Manual Blocker Rule

This baseline must be usable without live Supabase project credentials. If a task requires linking a live project, mutating production, or reading real data, stop and report the manual blocker before continuing.
