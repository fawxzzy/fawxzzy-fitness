# Full Quarantine Recovery Ledger

Date: 2026-05-01

Canonical repo: `C:\ATLAS\repos\fawxzzy-fitness`

Quarantine source: `C:\ATLAS\repos\fawxzzy-fitness-quarantine`

Canonical baseline SHA before this wave: `e06e19fbe86ea224a7c6aad1ace4f14cb92af658`

Evidence files:
- `docs/recovery/fitness-quarantine-audit-2026-05-01.json`
- `docs/recovery/fitness-quarantine-audit-2026-05-01.md`
- `docs/recovery/full-quarantine-recovery-inventory.json`
- `docs/recovery/full-quarantine-normalized-audit.json`
- `docs/recovery/full-quarantine-normalized-audit.md`

Hard rules:
- Quarantine is a filesystem recovery source only.
- Quarantine Git metadata is not authoritative.
- No product or runtime diff may remain unclassified.
- `Still pending` must be empty before deploy.

## 1. Recovered
- Recovery docs and audits:
  - `docs/recovery/FULL-QUARANTINE-RECOVERY-LEDGER.md`
  - `docs/recovery/fitness-quarantine-audit-2026-05-01.json`
  - `docs/recovery/fitness-quarantine-audit-2026-05-01.md`
  - `docs/recovery/full-quarantine-recovery-inventory.json`
  - `docs/recovery/full-quarantine-normalized-audit.json`
  - `docs/recovery/full-quarantine-normalized-audit.md`
  - `docs/recovery/final-quarantine-diff-audit.json`
  - `docs/recovery/final-quarantine-diff-audit.md`
- Support-layer recovery landed into canonical:
  - `package.json`
  - `package-lock.json`
  - `docs/LOCAL-PROD-DATA-SYNC.md`
  - `scripts/dev.mjs`
  - `scripts/generate-exercise-icon-manifest.mjs`
  - `scripts/generate-icons.mjs`
  - `scripts/next-workspace-guard.mjs`
  - `scripts/release.mjs`
  - `scripts/verify-history-family-ui.mjs`
  - `scripts/qa/cdp-edge.mjs`
  - quarantine-only helper scripts under `scripts/**` needed for QA/build/recovery support
  - `supabase/data/global_exercises_canonical.json`
  - `supabase/data/global_exercises_catalog_index.csv`
  - `supabase/data/global_exercises_catalog_index.json`
  - `supabase/data/global_exercises_review_queue.json`
  - `supabase/migrations/038_fix_strength_exercise_measurement_labels.sql`
  - `supabase/migrations/039_seed_global_stretch.sql`
  - `supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql`
  - `supabase/migrations/041_allow_measurement_optional_session_and_routine_goals.sql`
  - `tests/design-system-contract.test.mjs`
- Packaging fix required by recovered visual scripts:
  - `playwright` added to `devDependencies` and `package-lock.json`

## 2. Intentionally Discarded
- Exact quarantine versions intentionally not taken verbatim where canonical needed a merged or stronger form:
  - `package.json`
    - kept canonical strict verify/build scripts and added recovered QA/live-loop commands plus `playwright`
  - `scripts/dev.mjs`
    - kept canonical production-data safety guard and merged quarantine LAN/dev-receipt behavior
  - `docs/LOCAL-PROD-DATA-SYNC.md`
    - kept canonical deploy-safety rules and merged recovered `qa:dev` / `qa:dev:lan` workflow
  - `tests/design-system-contract.test.mjs`
    - kept the recovered bridge coverage but replaced stale quarantine-only assertions with checks that match the current component token usage
- Canonical-only files intentionally preserved because they represent post-quarantine safety work:
  - `docs/PLAYBOOK_NOTES.md`
  - `middleware.ts`
  - `next.config.mjs`

## 3. Generated/Cache/Noise
- CRLF-only or normalized-equal filesystem noise identified by the normalized audit:
  - `src/components / same_ignore_crlf`: `67`
  - `src/app / same_ignore_crlf`: `39`
  - `src/lib / same_ignore_crlf`: `36`
  - `src/features / same_ignore_crlf`: `5`
  - `public/exercises / same_ignore_crlf`: `3`
  - `src/generated / same_ignore_crlf`: `2`
  - `scripts / same_ignore_crlf`: `5`
  - `tests / same_ignore_crlf`: `1`
  - `public/app / same_ignore_crlf`: `1`
  - `vercel.json / same_ignore_crlf`: `1`

## 4. ATLAS-Only Unrelated
- Quarantine Git metadata and ATLAS-root linkage were treated as non-authoritative and were not used as recovery truth.

## 5. Still Pending
- None.
- Final audit remainder is fully classified in `docs/recovery/final-quarantine-diff-audit.md`.

## 6. Verification Evidence
- `node --check` passed across the recovered script surface
- `node --test tests/design-system-contract.test.mjs` passed
- `npm run test:app-theme-contracts` passed
- `npm run test:auth-ui-contracts` passed
- `npm run verify` passed
- `npm run verify:strict` passed
- `npm run build` passed
- `npm run migration:validate` failed with expected drift because local migrations `038` through `041` are now ahead of the remote baseline that still reports them as missing

## 7. Visual Smoke Evidence
- HTTP smoke from canonical local dev server:
  - `/login` -> `200`
  - `/signup` -> `200`
  - `/entry` -> `200`
  - `/today` -> `200`
  - `/routines` -> `200`
  - `/history` -> `200`
  - `/settings` -> `200`
- Screenshot smoke captured through recovered QA tooling:
  - `C:\ATLAS\tmp\recovery-login-smoke.png`
  - `C:\ATLAS\tmp\recovery-entry-smoke.png`
- Browser-tool limitation:
  - the Codex Playwright MCP launcher still fails on this machine with Chrome `spawn UNKNOWN`, so local visual smoke used the repo’s recovered screenshot path instead

## 8. Prod Deploy Evidence
- Current clean production baseline before this wave:
  - SHA: `e06e19fbe86ea224a7c6aad1ace4f14cb92af658`
  - Deployment: `dpl_7Mp8KNSv43rkVxcS6r1KzRUGUNhi`
  - Status: GitHub-backed and clean
- This recovery wave has not deployed production yet.
