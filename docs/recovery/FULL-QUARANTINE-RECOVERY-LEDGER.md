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
- Lane D/E recovery completed in this wave. See section 5 for the recovered file list.

## 2. Intentionally Discarded
- Lane D/E discards and generated/noise exclusions are documented in section 5.

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
- Lane D/E audit did not identify any additional ATLAS-only recovery candidates beyond the general quarantine-only QA/diagnostic helpers listed in section 5.

## 5. Lane D/E Result
Recovered in this wave:
- `package.json`
- `docs/LOCAL-PROD-DATA-SYNC.md`
- `supabase/migrations/038_fix_strength_exercise_measurement_labels.sql`
- `supabase/migrations/039_seed_global_stretch.sql`
- `supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql`
- `supabase/migrations/041_allow_measurement_optional_session_and_routine_goals.sql`
- `supabase/data/global_exercises_canonical.json`
- `scripts/dev.mjs`
- `scripts/env-file.mjs`
- `scripts/next-workspace-guard.mjs`
- `scripts/generate-exercise-icon-manifest.mjs`
- `scripts/generate-icons.mjs`
- `scripts/release.mjs`
- `scripts/verify-history-family-ui.mjs`
- `public/favicon.ico`
- `src/generated/exerciseIconManifest.ts`
- `tests/design-system-contract.test.mjs`
- `tests/mobile-regression/build-mobile-regression-boards.test.ts`

Intentionally left out for this lane:
- `public/app/previews/manifest.json`
- `src/generated/appBuildManifest.json`
- `public/brand/atlas-sigil-master.png`
- `scripts/generate-pwa-assets.mjs`
- `scripts/next-cli.mjs`
- `scripts/qa-ui-pass.mjs`
- `scripts/qa/fitness-qa-config.mjs`
- quarantine-only QA/diagnostic helpers outside the narrow product-supporting path

Notes:
- `src/types/db.ts` did not need a change for this wave because it already includes `curation_tags` and the new migration set stays inside that type surface.
- `vercel.json` was identical and required no recovery.

## 6. Still Pending

Raw byte-level inventory totals from the May 1 audit:
- `src/components / different`: `67`
- `src/app / different`: `39`
- `src/lib / different`: `36`
- `scripts / only_quarantine`: `20`
- `scripts / different`: `11`
- `supabase / only_quarantine`: `7`
- `src/features / different`: `5`
- `public/exercises / different`: `3`
- `tests / different`: `2`
- `src/generated / different`: `2`
- `package.json / different`: `1`
- `public/app / different`: `1`
- `supabase / different`: `1`
- `vercel.json / different`: `1`
- `docs/LOCAL-PROD-DATA-SYNC.md / different`: `1`

Normalized audit result:
- Lane A product files are currently text-equal after CRLF normalization.
- Lane B product files are currently text-equal after CRLF normalization.
- Lane C product files are currently text-equal after CRLF normalization.
- Remaining material queue is concentrated in scripts, Supabase data/migrations, package/docs, and one test file.

Pending recovery lanes after normalization:
- Lane D: Supabase, DB types, product data contracts
  - Material targets:
    - `supabase/data/global_exercises_canonical.json`
    - `supabase/data/global_exercises_catalog_index.csv`
    - `supabase/data/global_exercises_catalog_index.json`
    - `supabase/data/global_exercises_review_queue.json`
    - `supabase/migrations/038_fix_strength_exercise_measurement_labels.sql`
    - `supabase/migrations/039_seed_global_stretch.sql`
    - `supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql`
    - `supabase/migrations/041_allow_measurement_optional_session_and_routine_goals.sql`
- Lane E: scripts, generated artifacts, QA/dev tooling
  - Material targets:
    - `package.json`
    - `docs/LOCAL-PROD-DATA-SYNC.md`
    - `scripts/dev.mjs`
    - `scripts/generate-exercise-icon-manifest.mjs`
    - `scripts/generate-icons.mjs`
    - `scripts/qa/cdp-edge.mjs`
    - `scripts/release.mjs`
    - `scripts/verify-history-family-ui.mjs`
    - quarantine-only scripts under `scripts/**`
    - `tests/design-system-contract.test.mjs`

Canonical-only safety items to preserve during recovery:
- `docs/PLAYBOOK_NOTES.md`
- `middleware.ts`
- `next.config.mjs`

## 6. Verification Evidence
- Pending.

## 7. Visual Smoke Evidence
- Pending.

## 8. Prod Deploy Evidence
- Current clean production baseline before this wave:
  - SHA: `e06e19fbe86ea224a7c6aad1ace4f14cb92af658`
  - Deployment: `dpl_7Mp8KNSv43rkVxcS6r1KzRUGUNhi`
  - Status: GitHub-backed and clean
