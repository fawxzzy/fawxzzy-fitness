# Prod To Local DB Mirror

## Purpose

This mirror path is one-way only:

- production Supabase -> local Supabase

It is intentionally **not** a general sync tool and it is never a local-to-production write path.

## Safety Promise

This tool is destructive to local data only. It refuses any destination that is not local, it never runs `supabase db push`, and it should use a read-only production database credential whenever possible.

## Files

- script: `scripts/sync-prod-to-local.mjs`
- package script: `npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror --yes`
- example env: `.env.prod-local-mirror.example`

## Required Env File

Use a separate env file that Next does not auto-load:

```dotenv
PROD_SUPABASE_PROJECT_REF=lpswxoyfniocuhljgzbc
PROD_DATABASE_URL=postgresql://readonly:replace-me@example.invalid:5432/postgres
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Recommended local filename:

- `.env.prod-local-mirror`

Do not put production DB URLs into:

- `.env.local`
- `.env.production.local`
- normal app startup env files

## Hard Guards

The script refuses to run unless all of these checks pass:

1. `PROD_SUPABASE_PROJECT_REF` is exactly `lpswxoyfniocuhljgzbc`.
2. `LOCAL_DATABASE_URL` points to `localhost`, `127.0.0.1`, or `::1`.
3. `PROD_DATABASE_URL` does not point to a local host.
4. `PROD_DATABASE_URL` and `LOCAL_DATABASE_URL` are not identical.
5. Placeholder/example values are rejected.
6. You explicitly pass `--yes`.

## What The Script Does

1. Loads a dedicated mirror env file.
2. Validates the one-way safety guards.
3. Uses `pg_dump` to export `public` schema data from production.
4. Truncates local `public` tables with `RESTART IDENTITY CASCADE`.
5. Restores the dumped `public` data into local with `psql`.
6. Deletes the dump afterward unless `--keep-dump` is passed.

Schema scope is:

- `public` only

Default auth behavior is:

- do not mirror `auth.*`

## Auth Caveat

This script does not copy `auth.users` or `auth.identities` by default.

If you need local sessions to line up with mirrored production data, use one of these explicit paths:

- create a local auth user with the same UUID as the production user
- mirror only the specific auth rows you need through a separate, explicit auth-sync process
- use local admin/dev tooling that impersonates the production `user_id`

Do not blindly mirror the full auth schema unless you have a specific reason and a separate review path for that data.

## Usage

Fail safely with the example env:

```powershell
npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror.example
```

Print the plan and refuse without confirmation:

```powershell
npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror
```

Run the destructive local refresh:

```powershell
npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror --yes
```

Keep the generated SQL dump for inspection:

```powershell
npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror --yes --keep-dump
```

## Requirements

This script expects PostgreSQL client tools on the machine:

- `pg_dump`
- `psql`

It does not require `supabase db push`, and it never calls that command.
