# Promoted Notes from FawxzzyFitness

<!-- PLAYBOOK_NOTE_ID:2026-03-01-never-conditionally-suppress-media-sections-when-fallback-assets-are-valid-ux -->
### Never conditionally suppress media sections when fallback assets are valid UX (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: If a media slot has a canonical resolver + safe placeholder fallback, always render the slot and let the image component degrade to placeholder rather than hiding the section.
Rationale: Gating section render on “non-placeholder” checks can regress into blank UI states and break consistency across list/detail surfaces.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfoSheet.tsx
- src/lib/exerciseImages.ts
- src/components/ExerciseAssetImage.tsx
