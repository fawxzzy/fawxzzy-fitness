# Full Quarantine Normalized Audit

Date: 2026-05-01

This pass normalizes CRLF-only differences. `same_ignore_crlf` means the canonical and quarantine file contents are text-equal after end-of-line normalization.

## Counts by target/normalized status
- `src/components / same_ignore_crlf`: `67`
- `src/app / same_ignore_crlf`: `39`
- `src/lib / same_ignore_crlf`: `36`
- `scripts / only_quarantine`: `20`
- `supabase / only_quarantine`: `7`
- `scripts / material_different`: `6`
- `src/features / same_ignore_crlf`: `5`
- `scripts / same_ignore_crlf`: `5`
- `public/exercises / same_ignore_crlf`: `3`
- `src/generated / same_ignore_crlf`: `2`
- `vercel.json / same_ignore_crlf`: `1`
- `tests / material_different`: `1`
- `supabase / material_different`: `1`
- `tests / same_ignore_crlf`: `1`
- `next.config.mjs / only_canonical`: `1`
- `middleware.ts / only_canonical`: `1`
- `docs/PLAYBOOK_NOTES.md / only_canonical`: `1`
- `docs/LOCAL-PROD-DATA-SYNC.md / material_different`: `1`
- `public/app / same_ignore_crlf`: `1`
- `package.json / material_different`: `1`

## Material or structural differences still requiring classification
- `docs/LOCAL-PROD-DATA-SYNC.md` / `material_different` / `.`
- `docs/PLAYBOOK_NOTES.md` / `only_canonical` / `.`
- `middleware.ts` / `only_canonical` / `.`
- `next.config.mjs` / `only_canonical` / `.`
- `package.json` / `material_different` / `.`
- `scripts` / `only_quarantine` / `analyze-exercise-catalog.mjs`
- `scripts` / `only_quarantine` / `build-timing.mjs`
- `scripts` / `material_different` / `dev.mjs`
- `scripts` / `only_quarantine` / `generate-app-build-manifest.mjs`
- `scripts` / `material_different` / `generate-exercise-icon-manifest.mjs`
- `scripts` / `material_different` / `generate-icons.mjs`
- `scripts` / `only_quarantine` / `generate-stretch-library-split.mjs`
- `scripts` / `only_quarantine` / `next-build-guard.mjs`
- `scripts` / `only_quarantine` / `next-workspace-guard.mjs`
- `scripts` / `only_quarantine` / `profile-next-build.mjs`
- `scripts` / `material_different` / `qa\cdp-edge.mjs`
- `scripts` / `only_quarantine` / `qa\dev-fresh.mjs`
- `scripts` / `only_quarantine` / `qa\fitness-auth-artifact.mjs`
- `scripts` / `only_quarantine` / `qa\fitness-local-feedback.mjs`
- `scripts` / `only_quarantine` / `qa\fitness-mobile-loop.mjs`
- `scripts` / `only_quarantine` / `qa\fitness-qa-user.mjs`
- `scripts` / `only_quarantine` / `qa\fitness-tunnel.mjs`
- `scripts` / `only_quarantine` / `qa\update-app-preview-assets.mjs`
- `scripts` / `only_quarantine` / `qa\visual-fitness-readiness.mjs`
- `scripts` / `only_quarantine` / `qa\visual-fitness-runner.mjs`
- `scripts` / `only_quarantine` / `qa\visual-fitness-suites.mjs`
- `scripts` / `only_quarantine` / `qa\visual-fitness-theme.mjs`
- `scripts` / `only_quarantine` / `refresh-exercise-catalog.mjs`
- `scripts` / `material_different` / `release.mjs`
- `scripts` / `only_quarantine` / `typecheck-debt-inventory.mjs`
- `scripts` / `material_different` / `verify-history-family-ui.mjs`
- `supabase` / `material_different` / `data\global_exercises_canonical.json`
- `supabase` / `only_quarantine` / `data\global_exercises_catalog_index.csv`
- `supabase` / `only_quarantine` / `data\global_exercises_catalog_index.json`
- `supabase` / `only_quarantine` / `data\global_exercises_review_queue.json`
- `supabase` / `only_quarantine` / `migrations\038_fix_strength_exercise_measurement_labels.sql`
- `supabase` / `only_quarantine` / `migrations\039_seed_global_stretch.sql`
- `supabase` / `only_quarantine` / `migrations\040_exercise_curation_tags_and_howto_refresh.sql`
- `supabase` / `only_quarantine` / `migrations\041_allow_measurement_optional_session_and_routine_goals.sql`
- `tests` / `material_different` / `design-system-contract.test.mjs`
