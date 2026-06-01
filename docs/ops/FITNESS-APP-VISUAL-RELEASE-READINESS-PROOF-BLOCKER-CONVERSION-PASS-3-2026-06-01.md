# Fitness App Visual Release-Readiness Proof Blocker Conversion Pass 3 - 2026-06-01

- Date: `2026-06-01`
- Lane: `Fitness app visual release-readiness proof blocker conversion pass 3`
- Owner: `fawxzzy-fitness`
- Mode: `owner-side blocker conversion`
- Source decision:
  - `docs/ops/ROOT-BOUNDED-LANE-SELECTION-PASS-AFTER-LOCAL-DATA-GATEWAY-REPO-NAMING-REUSABLE-PROOF-FAMILY-ADOPTABLE-NOW-THRESHOLD-CHECKPOINT-CLOSEOUT-2026-06-01.md`
- Inherited receipt:
  - `docs/ops/FITNESS-APP-RELEASE-READINESS-EVIDENCE-REFRESH-PASS-2-2026-06-01.md`

## Done

- converted the protected-route visual proof family from redirect-blocked to captured
- converted the seam-route abort class for `settings-default` and `history-exercises-detailed` back to captured proof
- converted the stale App Theme contract proof from a mismatched harness assertion to a real captured contract run
- converted proof-run tracked-output drift into deterministic generated outputs with stable rerun hashes
- narrowed the remaining release-readiness blocker to the standalone linked Supabase migration validator crash plus ordinary local pass dirt until this packet is preserved

## Now

- readiness posture: `improved`, still `not release-ready`
- visual proof is no longer the dominant blocker class
- protected-route proof now reaches authenticated routes under the QA session
- seam proof now covers the formerly aborting routes
- `public/sw.js` and `src/generated/appBuildManifest.json` now rerun without hash changes
- the remaining release-gate blocker is `npm run migration:validate`, which now fails transparently with a Bun-backed Supabase CLI JSON parse crash while reading linked migration state

## Next

- `Fitness app linked Supabase migration validator crash conversion pass 4`

## Repo Health Check

- repo-local verify command:
  - `npm run verify`: `PASS`
- current ATLAS/root baseline referenced by this pass:
  - `critical=0 error=0 warning=489 info=0`
- current Fitness owner-side release posture:
  - visual proof family converted
  - release-ready status still blocked by linked migration validation and local pass dirt until preserved

## Blockers Addressed

### 1. Protected-route visual proof auth-consumption mismatch

- before:
  - `/today`
  - `/session/[latest]`
  - `/routines`
  - `/history`
  - `/history/exercises`
  - `/history/[latest]`
  all redirected to `/login` inside the visual runner despite a valid QA session
- fix landed:
  - the visual runner now consumes persisted browser storage state from `../../runtime/fitness/qa-storage-state.json`
  - protected suites no longer env-gate themselves when a valid QA session artifact already exists
- after:
  - protected captures are green across `settings`, `today`, `session`, `routines`, `history`, `history-exercises`, and `history-detail`

### 2. Seam proof aborts on `settings-default` and `history-exercises-detailed`

- before:
  - seam routes aborted with `page.goto net::ERR_ABORTED`
- fix landed:
  - the runner no longer hops through `/login`
  - theme/bootstrap local state is injected through `context.addInitScript(...)` before first navigation
- after:
  - both `settings-seam` and `history-exercises-seam` now capture successfully

### 3. App Theme contract false negative

- before:
  - the contract route reached `/settings` but the runner asserted editor headings while leaving the Default preset selected
- fix landed:
  - the suite now opens the `App Theme` panel, selects `Slot 1`, and checks the current title-case contract labels
- after:
  - `visual:fitness:app-theme-contract` now captures successfully

### 4. Proof-run tracked-output drift

- before:
  - proof execution dirtied:
    - `public/sw.js`
    - `src/generated/appBuildManifest.json`
- fix landed:
  - both generators now write only when file content actually changes
  - the local manifest generator now reuses or deterministically derives a stable non-deploy manifest instead of rewriting on every proof run
- after:
  - rerun hash check showed no content change for either generated file

### 5. Standalone migration validator crash

- before:
  - `npm run migration:validate` failed opaquely on Windows because the wrapper could not spawn `npx.cmd`
- fix landed:
  - the validator now shells through `cmd.exe` on Windows so the linked Supabase command path executes and reports the real failure
- after:
  - the residual is now explicit:
    - `SyntaxError: JSON Parse error: Unable to parse JSON string`
    - source: Bun-backed `supabase.exe` during `supabase migration list --linked`
- classification:
  - still `release-relevant`
  - now a narrower linked-validator crash blocker, not a silent harness failure

## Fixes Landed

- `scripts/qa/visual-fitness-runner.mjs`
  - consume persisted QA storage state for protected suites
  - stop requiring live QA credentials when a valid session artifact already exists
  - inject theme/bootstrap local state before first route navigation
  - support selecting a custom theme slot during the App Theme contract interaction
- `scripts/qa/visual-fitness-suites.mjs`
  - align the App Theme contract with the current settings editor flow and current section labels
- `scripts/generate-app-build-manifest.mjs`
  - avoid nondeterministic local manifest rewrites
- `scripts/generate-service-worker.mjs`
  - avoid no-op rewrites
- `scripts/migration/validate-supabase-chain.mjs`
  - execute linked Supabase commands correctly on Windows and surface the real CLI crash

## Exact Verification Commands Run

```powershell
$env:FITNESS_ENV_FILE='..\..\secrets\fitness-lps-dev.env'; npm run qa:auth:bootstrap
$env:FITNESS_ENV_FILE='..\..\secrets\fitness-lps-dev.env'; npm run qa:auth:check
node scripts/qa/visual-fitness-runner.mjs --suite settings-seam
node scripts/qa/visual-fitness-runner.mjs --suite history-exercises-seam
npm run visual:fitness:routines
npm run visual:fitness:history
npm run visual:fitness:history-exercises
npm run visual:fitness:history-detail
npm run visual:fitness:app-theme-contract
npm run migration:validate
npm run release:fitness:ready -- --json
node scripts/generate-service-worker.mjs
node scripts/generate-app-build-manifest.mjs
npm run verify
npm run visual:fitness:readiness
```

Additional classification probe:

```powershell
@'
import { runSupabaseCommand } from './scripts/migration/validate-supabase-chain.mjs';
const list = runSupabaseCommand(['supabase','migration','list','--linked']);
console.log(JSON.stringify({status:list.status, signal:list.signal, error:list.error?.message ?? null, stdout:list.stdout, stderr:list.stderr, combined:list.combined}, null, 2));
'@ | node --input-type=module -
```

## Validation / Proof Results

- `qa:auth:bootstrap`: `PASS`
- `qa:auth:check`: `PASS`
- `settings-seam`: `PASS`
- `history-exercises-seam`: `PASS`
- `visual:fitness:routines`: `PASS`
- `visual:fitness:history`: `PASS`
- `visual:fitness:history-exercises`: `PASS`
- `visual:fitness:history-detail`: `PASS`
- `visual:fitness:app-theme-contract`: `PASS`
- `visual:fitness:readiness`: `PASS`
  - latest readiness manifest:
    - `../../tmp/captures/fitness/readiness/visual-readiness.latest.json`
  - status:
    - `ready-for-live-ui-pass`
  - protected proof:
    - all captured
  - seam proof:
    - all captured
- deterministic generator rerun check:
  - `public/sw.js`: unchanged hash
  - `src/generated/appBuildManifest.json`: unchanged hash
- `npm run verify`: `PASS`
- `npm run release:fitness:ready -- --json`: `FAIL`
  - remaining failing checks:
    - dirty worktree on `main`
    - linked migration validator crash
- `npm run migration:validate`: `FAIL`
  - exact residual:
    - Bun-backed `supabase.exe` JSON parse crash while running `supabase migration list --linked`

## Remaining Blockers

| Blocker | Severity | Release-blocking | Evidence |
| --- | --- | --- | --- |
| Standalone linked Supabase migration validator crash | high | yes | `npm run migration:validate` now surfaces a Bun-backed `supabase.exe` JSON parse crash while reading linked migration state |
| Dirty working tree from current owner-side pass and intentional generated-truth refresh | medium | yes for `release:fitness:ready`, no for product proof | `release:fitness:ready -- --json` still fails the git-clean check while this pass is uncommitted |

Residual local-only noise still observed:

- `src/lib/stretch-library-details.ts`
- `src/lib/stretch-library-summaries.ts`

These remain line-ending-only worktree drift with no semantic diff.

## Readiness Posture Change Or Flat Hold

- posture change: `improved`
- why:
  - the protected-route visual proof family is now captured instead of redirect-blocked
  - the seam-route abort family is now captured instead of aborting
  - the App Theme proof contract now captures honestly
  - proof-run tracked-output drift is now deterministic
- why not promoted further:
  - the standalone linked Supabase migration validator still fails
  - `release:fitness:ready -- --json` still fails until the current packet is preserved and the migration validator is converted

## Marker Update

- `none`

## Recommended Execution Path

- execute `Fitness app linked Supabase migration validator crash conversion pass 4`
- keep scope bounded to:
  - linked Supabase CLI/runtime crash classification and repair
  - release-readiness gate revalidation after the validator class is converted
  - preserving the current owner-side proof packet as intended truth
