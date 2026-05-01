# Local And Production Sync

This app has two separate sync surfaces:

- Code sync: Vercel can be serving code that is not yet recoverable from GitHub if production was deployed from a dirty local workspace.
- Data sync: local only mirrors production account/routine/session data when it points at the same Supabase project as production.

## Safety Rule

Do not treat local-against-production-data as the default mode.

- Keep `.env.local` for the normal local project you use during development.
- Use a separate override file such as `.env.production.local` only when you intentionally want local actions to read and write production data.
- The local dev entrypoints now refuse to start from a `production`-named env file unless `ALLOW_PROD_SUPABASE_IN_DEV=1` is explicitly set.

That guard applies to:

- `npm run dev`
- QA scripts that load `scripts/qa/fitness-qa-config.mjs`

## Recover Production Code First

Before tagging or redeploying, make sure the currently deployed production code exists in Git:

```powershell
git show --stat c55728235648a4a45bfe49a48ed1bd7a7086391e
git branch prod/current c55728235648a4a45bfe49a48ed1bd7a7086391e
git push origin prod/current
```

Run those on the machine or workspace that created the live Vercel deploy. If that commit does not exist there, do not redeploy from current `main` until the deployed code is recovered into Git.

## Prepare A Production-Data Local Profile

1. Pull the production env from Vercel.
2. Copy only the values you need into a dedicated local override file.
3. Keep local app URLs pointed at the local server.

Suggested keys in `.env.production.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<production supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production anon key>
SUPABASE_SERVICE_ROLE_KEY=<production service role key if a local admin path needs it>
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
APP_URL=http://127.0.0.1:3000
ALLOW_PROD_SUPABASE_IN_DEV=1
```

## Start Local Against Production Data

PowerShell:

```powershell
$env:FITNESS_ENV_FILE = ".env.production.local"
$env:ALLOW_PROD_SUPABASE_IN_DEV = "1"
npm run dev
```

Or pass the override file directly to the dev script:

```powershell
npm run dev -- --env-file .env.production.local
```

POSIX shell:

```bash
FITNESS_ENV_FILE=.env.production.local ALLOW_PROD_SUPABASE_IN_DEV=1 npm run dev
```

## Notes

- Pushing code does not delete Supabase rows by itself.
- Running local against production data does mean local actions can mutate production immediately.
- `.env*` files are ignored from Git in this repo and should stay local-only.
