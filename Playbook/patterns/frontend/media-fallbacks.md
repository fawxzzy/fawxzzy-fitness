# Promoted Notes from FawxzzyFitness

<!-- PLAYBOOK_NOTE_ID:2026-02-27-generate-runtime-media-manifests-from-public-assets-for-deterministic-lookups -->
### Generate runtime media manifests from public assets for deterministic lookups (from FawxzzyFitness notes, 2026-02-27)
Type: Guardrail
Summary: When UI code resolves static media by slug, generate a build-time manifest from the asset directory and only request files declared in that manifest.
Rationale: Prevents noisy production 404 spam caused by optimistic path construction when catalog slugs outpace available assets.
Evidence (FawxzzyFitness):
- scripts/generate-exercise-icon-manifest.mjs
- src/generated/exerciseIconManifest.ts
- src/lib/exerciseImages.ts
