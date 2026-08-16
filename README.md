# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

Repo-local agent guidance lives in `AGENT.md`. Treat it as the product-specific operating layer for app behavior, UI language, and implementation preferences in this repository.

Canonical roadmap planning lives in `docs/ROADMAP.md`.

## Fitness deploy authority

Fitness repo-local commands can verify, build, version, and prepare release artifacts, but they do not authorize preview or production deployment by themselves.

Approved deploy authority:

- `_stack` owns Fitness preview and production deploy orchestration
- run preview and production deploys from `repos/_stack`
- use `_stack` `fitness:deploy:*` commands as the only approved operator path

Non-authority surfaces in this repo:

- `npm run release:patch`
- `npm run release:minor`
- `npm run release:major`
- repo-local `vercel` or `vercel --prod`

Those surfaces can support release preparation, recovery, or local investigation, but they are not the approved default production release path.

## Playbook runtime command path (canonical)

This repository uses the top-level npm commands backed by `scripts/playbook-runtime.mjs`, which resolves the runtime through the canonical official fallback path or an explicitly enabled package install. Treat those top-level npm commands as the only supported operator path for Playbook in this repo.

Canonical model:
- shared Playbook core runtime
- repo-local state in `.playbook/`
- one documented operator path in repo scripts/docs
- repo-local adoption evidence in `exports/fitness.playbook.adoption.evidence.v1.json` and `docs/ops/FITNESS-PLAYBOOK-ADOPTION.md`

## ATLAS platform v1 adoption

Fitness now carries repo-owned ATLAS platform v1 declarations in `exports/fitness.atlas.*.json`.

Wave 2A adds:

- a pinned ATLAS schema validation lane via `npm run test:atlas-contracts`
- a live `/api/health` route that returns the ATLAS v1 health payload
- a Fitness-owned contract workflow at `.github/workflows/atlas-contracts.yml`

Implementation notes live in `docs/ops/FITNESS-ATLAS-CONTRACT-ADOPTION.md`.

## Playbook runtime setup

Deterministic Playbook resolution is official-fallback-first and does **not** rely on a globally installed `playbook` on `PATH`.

Resolution order used by `scripts/playbook-runtime.mjs`:
1. `PLAYBOOK_BIN` environment override.
2. Repo-local Playbook install (prefers `node_modules/.bin/playbook`, then installed package entrypoint resolution).
3. Official GitHub release fallback install at `.playbook/runtime/node_modules/.bin/playbook`.
4. Otherwise fail with a precise actionable error describing what was checked.

Expected unresolved error shape:
- `Unable to resolve a Playbook executable.`
- `Checked: PLAYBOOK_BIN... -> repo-local package/bin resolution -> official fallback install ...`
- action list for env override / official fallback install / explicitly-enabled package acquisition

### Canonical official acquisition path

Base install intentionally does **not** hard-require a Playbook npm package in `package.json`, and clean-environment bootstrap should assume the official GitHub release tarball is the supported distribution contract.

```bash
npm ci
node scripts/playbook-runtime.mjs --install-official-fallback
env -u PLAYBOOK_BIN node scripts/playbook-runtime.mjs ai-context
```

Expected behavior:
- clean dependency install succeeds without any Playbook registry package assumption
- official runtime acquisition downloads the pinned release tarball to a temp `.tgz` under `.playbook/runtime/`
- installer verifies the pinned SHA-256 before writing or installing the tarball, then logs the source URL, final resolved URL, HTTP status, local tarball path, artifact size, and verified digest
- runtime writes under `.playbook/`

### Optional package acquisition path (explicit opt-in only)

Package acquisition is **not** attempted by default. Only use it when you intentionally want to test or consume a published package coordinate, and enable it explicitly by env/config:

```bash
PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1 PLAYBOOK_PACKAGE_SPEC="@fawxzzy/playbook-cli@0.1.8" node scripts/playbook-runtime.mjs --install-package
```

Notes:
- If `PLAYBOOK_ENABLE_PACKAGE_ACQUIRE` is unset and `PLAYBOOK_PACKAGE_SPEC` is empty, `--install-package` exits with guidance instead of attempting a non-canonical branch.
- `PLAYBOOK_PACKAGE_SPEC` remains an override for environments that intentionally validate a published package artifact.
- The default operator and CI path should not depend on a package coordinate that may be unpublished or unsupported.

### Official fallback spec rules

`PLAYBOOK_OFFICIAL_FALLBACK_SPEC` defaults to the pinned retained GitHub release asset: `https://github.com/fawxzzy/playbook/releases/download/v0.54.0/playbook-cli-0.54.0.tgz`. Its canonical SHA-256 is `1803d9313d8ed8b36e5c674ce71b39e5193b70aa291b67a1223afa7eb18508b5`.

Supported forms:
- `https://` / `http://` tarball URL
- `file:` URL
- local filesystem tarball path

Every custom URL, `file:` URL, or local tarball override must also set `PLAYBOOK_OFFICIAL_FALLBACK_SHA256` to the expected 64-character digest. Git install targets are not accepted by this verified artifact path because they cannot satisfy the tarball digest contract.

Unsupported form:
- registry-style package specs such as `@fawxzzy/playbook-cli@0.1.8`

CI should install dependencies with `npm ci`, acquire the runtime through `node scripts/playbook-runtime.mjs --install-official-fallback`, unset `PLAYBOOK_BIN`, and then validate the canonical command ladder.

## Playbook workflow: bootstrap → intelligence → remediation

### 1) Bootstrap commands

```bash
npm run ai-context
npm run ai-contract
npm run index
```


### 2) Repo-intelligence commands

```bash
npm run context
npm run query:modules
npm run explain:architecture
npm run ask:repo-context
```

These map to canonical Playbook runtime surfaces via the bridge:
- `context`
- `query modules`
- `explain architecture`
- `ask --repo-context` (optional upstream capability; availability depends on installed runtime)

### 3) Verification and planning flow

```bash
npm run verify
npm run plan
npm run pilot
```

### 4) Ignore tuning flow

```bash
npm run ignore:suggest
npm run ignore:apply
```

Rule: ignore tuning should narrow scan noise, **not** hide system truth. Keep architecture-defining areas (for example `src/`, `docs/ARCHITECTURE.md`, and key runtime scripts) visible to indexing and intelligence commands.

## Migration note

- Legacy learning/sync/update command families are retired.
- Vendored subtree workflow guidance is retired.
- Historical migration notes remain in `docs/CHANGELOG.md`, but they are not part of the active operator workflow.


## Dev-only UI contract audit surface

Use `/dev/ui-contract` in local development as the canonical visual inspection route for repeated UI families (headers, session cards + footer dock, Exercise Log, Configure Goal, Edit Day inline editor, View Day, rest-day, and planned workout variants).

Principles for this surface:
- **Rule:** every repeated UI family needs a canonical visual inspection surface.
- **Pattern:** deterministic fixtures turn styling drift into something inspectable and repeatable.
- **Failure Mode:** relying on memory and scattered screenshots causes “fixed in code, still wrong in render” regressions.

Usage loop:
1. Run `npm run dev` and open `http://localhost:3000/dev/ui-contract`.
2. Compare all grouped families and winner notes before/after a refactor.
3. Keep fixture values deterministic; update fixtures intentionally when contract changes are approved.

This route is internal/dev-only and intentionally excluded from production by returning `notFound()` when `NODE_ENV === "production"`.

## Local development

```bash
npm install
npm run dev
```

## Prod to local mirror

Use the existing mirror script for a one-time prod -> local data load before local launch or debugging. This is a controlled snapshot into local Postgres, not a live loop against production.

Keep the mirror env file outside the repo root under `secrets/local/...`. The current local target for this repo is Postgres on `127.0.0.1:5432`, so `LOCAL_DATABASE_URL` must point there rather than the Supabase CLI port `54322`.

```powershell
cd repos\fawxzzy-fitness
node .\scripts\sync-prod-to-local.mjs --env ..\..\secrets\local\fitness-prod-to-local.env --yes
```

Required env keys:

```env
PROD_SUPABASE_PROJECT_REF=lpswxoyfniocuhljgzbc
PROD_DATABASE_URL=postgresql://...
LOCAL_DATABASE_URL=postgresql://...127.0.0.1:5432...
```

The script mirrors only the `public` schema and destructively refreshes local data before reload, so treat the env file and resulting dataset as controlled production-derived material.

## Quality checks

```bash
npm run lint
npm run build
```

## Install gate

Browser visits to `/` now land on an install-first entry surface. Installed or standalone launches skip that gate and continue into the normal app flow automatically.

- Chromium browsers use the native install prompt only after the browser exposes `beforeinstallprompt`.
- iPhone and iPad use manual Add to Home Screen instructions instead of a fake install button.
- Unsupported browsers still expose a small Continue in browser fallback so auth, recovery, and deep app flows remain usable.

## Routine Details save contract

Create Routine and Edit Routine both follow an explicit manual-save contract:

- Shared fields + validation: routine name, cycle length, start weekday, timezone, and weight unit are validated through the same routine-details draft helpers.
- Dirty-state behavior: Save/Create calls-to-action are disabled until the form is both valid and dirty.
- Save feedback states: routine details shows one of `Unsaved changes`, `Saving changes…`, or `All changes saved`.
- Navigation safety: when the form is dirty, leaving the page via browser navigation is guarded (`beforeunload`) and in-app back navigation prompts to discard changes.
- Destructive separation: Delete Routine remains a distinct destructive action and is not coupled to Save Changes.

## Fitness governed ecosystem contract

Fitness now ships an in-repo deterministic integration contract and fixtures for the governed ecosystem loop.

Key paths:
- Contract/types: `src/lib/ecosystem/`
- Deterministic fixtures: `src/lib/ecosystem/fixtures/`
- Canonical truth pack: `truth-pack/fitness/`
- Architecture doc: `docs/architecture/fitness-integration.md`

The contract is intentionally reusable for future apps by keeping the base ecosystem schemas generic and app bindings explicit.

Runtime app-boundary surfaces:
- Seam adapter/client: `src/lib/ecosystem/fitness-integration-client.ts`
- App-state snapshot fetch + publish bridge: `src/lib/ecosystem/fitness-integration-server.ts`
- Dev inspection endpoint: `src/app/api/ecosystem/fitness/debug/route.ts`
