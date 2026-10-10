# Fitness release readiness reports

These are review-only snapshots for human inspection. They must not mutate
production, deploy state, release ledger entries, or ATLAS receipts. A failing
readiness result is still a valid report outcome.

## Legacy database retirement

Fitness uses the `fitness` schema on the shared master. The older local SQL chain
describes a standalone project using `public`. Its linked-project ledger is not
the master's migration contract.

`npm run migration:validate` now exits nonzero with
`LEGACY_REMOTE_VALIDATION_RETIRED`. It launches no Supabase CLI command, resolves
no linked project and reads no credential file. Setting `SUPABASE_DB_PASSWORD`
does not reactivate it. Historical JSON parsers and explicitly injected evidence
runners remain available for replaying retained evidence in tests; their success
does not establish master acceptance.

`npm run release:fitness:ready` retains the other report checks, but its migration
check reports **master acceptance not evaluated**. A clean historical ledger,
empty mismatch list, caller-supplied success flag, or relabeled scope cannot make
this report production-ready. The progression visual receipt's migration lookup
also stops before any remote connection because it uses the same retired entry.
A complete visual receipt is reported with a warning that master migration
freshness was not evaluated, even when both historical mismatch lists are empty.

The direct legacy export POST at `/api/migration/export` returns HTTP 410 with
`FITNESS_LEGACY_EXPORT_RETIRED` and `Cache-Control: no-store`. It imports no auth
or legacy client code and reads no request body or credentials. Hiding the
legacy Settings UI alone did not disable this endpoint. Master snapshot import
and parity endpoints remain available under their existing authentication.

`npm run dev:fitness:lps` exits 1 with `FITNESS_LEGACY_DEV_RETIRED`, without
reading environment files or starting a child process. Environment overrides
and the historical recovery opt-in cannot reactivate this launcher.

`npm run db:mirror:prod-to-local` also exits 1, with
`FITNESS_LEGACY_MIRROR_RETIRED`, before reading arguments, environment or files.
Its old implementation was pinned to the legacy project and copied `public`
rows into a local database. Retained recovery archives and explicit local
fixtures replace that dependency. Do not repoint this standalone mirror at
shared master. `--yes`, `--env`, and `--help` do not reactivate it.

Ordinary dev and QA resolve only the repository's `.env.local` by default, or
an explicit `FITNESS_ENV_FILE` (and `--env-file` where supported). They no longer
discover or read shared `fitness-lps-dev.env` or `fitness-doctor.env` files.
Missing configuration does not fall back to a hosted database.

The default expected hosted target in the command guard and app diagnostic is
master, `bxtcuhkotumitoqtrcej.supabase.co`. This is a comparison value; it does
not supply a URL or credentials. Configure these explicitly. Local emulators
remain available through an explicit `FITNESS_EXPECT_SUPABASE_HOST`, such as
`127.0.0.1:54321`; existing production-file opt-in guards remain in force.
The legacy Fitness host is rejected by the shared command guard even with a
matching expected-host override. Both configured URL fields are checked, and
ports or a trailing DNS dot cannot reactivate it. The app diagnostic likewise
does not accept that retired target. These source changes require adoption in
the actual deployed/installed revision before claiming live-consumer retirement.

## Master replacement contract

The ATLAS Supabase consolidation owner owns the shared-master migration sequence.
The accepted R101 Fitness materialization, W10 Auth handoff, and Data API/security
receipts are distinct from this legacy ledger. They are evidence inputs, not a
blanket approval of a later application revision.

A replacement must bind the exact application revision and its required schema
changes to the governed master installation and current catalog/security proof.
It must check Fitness's schema without interpreting unrelated owners' migrations
as drift, and report uninstalled changes separately from historical local SQL.
There is currently no accepted mapping from this standalone ledger to that
contract. This change retires the obsolete connection; it does not implement or
claim the replacement's acceptance.

A bounded 2026-10-10 source/catalog comparison for parent
`ecd24320a48bdcd5b627d4b20f1c6c356ef7cc17` matched 27 generated tables, 472
columns, and 10 typed RPCs against master. It covered generated types,
nullability, write optionality, and typed RPC arguments/results. It did not
verify arbitrary query strings, all dynamic call paths, or deployed runtime
behavior. The optional `create_planner_routine_v1` and
`start_session_from_day_v1` helpers had no runtime callers in that source tree;
their existence does not require installing them to retire legacy consumers.

Do not relink the old migration chain to master, run its `db push` there, repair
master's ledger to match it, or weaken shared-schema access to satisfy this tool.
Local clean-chain or real-Postgres replay remains useful source verification;
neither is a live-master readiness result.

## Verification

Run the migration validator and release-readiness unit tests with mocked data.
The production-default validator should fail with the documented retirement
message even from a directory containing misleading linked-project metadata.
The export handler test uses a stub response constructor and rejects every
other import and all request/environment reads. Launcher tests cover default,
recovery opt-in, and env-file overrides; no real dev server is started.
Resolver/target tests cover absence of shared-file discovery or credential
reads, explicit files and local emulators, missing config, retired-host
overrides, guard ordering before spawn, and retained production-file opt-in.

Rule: retiring a database consumer must remove its implicit connection and
credential lookup. Never translate historical ledger success into current
shared-schema acceptance.

## Root layout route-slot release check

The root layout must render its Next.js route slot exactly once, inside
`ProtectedAppInstallGate`. Its Suspense fallback uses independent loading UI;
it must not reuse `children`. Duplicate route-slot serialization is associated
with the upstream `parallelRouterKey` null-props defect
([Next.js #64271](https://github.com/vercel/next.js/pull/64271)).

The October 10 PR193 production candidate passed build and public HTTP checks,
but canonical browser login failed with this error and was rolled back. The
single-slot source regression covers this structural defect; it does not prove
the cutover failure is fixed. A subsequent release must still verify fresh and
reused browser `/login` -> `/install` -> `/login` navigation on its candidate and
canonical URLs, with exact rollback on failure. Keep authenticated and installed
app acceptance separate. Do not bypass the installed-app gate or clear user
storage to obtain a passing result.
