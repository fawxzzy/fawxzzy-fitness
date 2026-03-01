# Pattern: Media Manifests and Deterministic Fallbacks

[Back to Index](../INDEX.md)

## Problem
Slug-based static media lookup can generate repeated 404 requests when paths are guessed optimistically instead of being validated against known assets.

## Guardrail: Generate runtime media manifests from public assets for deterministic lookups
- **Type:** Guardrail
- **Rationale:** Deterministic manifest gating prevents network spam, avoids noisy logs, and keeps fallback behavior explicit when assets are intentionally incomplete.

### How to apply checklist
- [ ] Generate a build-time manifest from the canonical asset directory (for example `scripts/generate-exercise-icon-manifest.mjs`).
- [ ] Commit generated output (`src/generated/exerciseIconManifest.ts`) or regenerate in CI/build hooks.
- [ ] Ensure lookup helpers consult the manifest first and only request declared paths.
- [ ] Fall back to placeholder media without attempting unknown slug URLs.
- [ ] Optionally cache known-missing runtime URLs for same-session suppression in shared image components.

### Example snippet
```ts
import { exerciseIconManifest } from "@/src/generated/exerciseIconManifest";

export function resolveExerciseImage(slug: string): string {
  const knownPath = exerciseIconManifest[slug];
  return knownPath ?? "/images/exercises/placeholder.svg";
}
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-27 media missing-url cache; 2026-02-28 manifest gating notes) + implementation evidence paths (`scripts/generate-exercise-icon-manifest.mjs`, `src/generated/exerciseIconManifest.ts`, `src/lib/exerciseImages.ts`).

## Guardrails

## 2026-03-01 — Treat seeded placeholder media defaults as unset in fallback resolvers
- **Type:** Guardrail
- **Status:** Proposed
- **Summary:** Canonical media resolvers MUST treat known seeded placeholder paths as unset values so fallback chains can select real assets, and MAY suppress optional sections only when no non-placeholder asset exists after normalization.
- **Rationale:** DB defaults can be truthy placeholder strings that block deterministic fallback behavior and show low-value placeholder panels despite available icon assets.
- **Evidence:** `src/lib/exerciseImages.ts`, `src/components/ExerciseInfoSheet.tsx`, `src/app/exercises/[exerciseId]/page.tsx`
- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-03-01 placeholder-as-unset guardrail).

### Do
- Normalize all candidate media paths before fallback selection.
- Keep one shared placeholder set (for example `SEEDED_PLACEHOLDER_PATHS`) used by every resolver.
- Resolve in deterministic order: explicit media -> canonical icon/manifest asset -> final safe placeholder.

### Don’t
- Treat any truthy DB string as a valid media asset.
- Duplicate placeholder detection logic across route/component-level callers.

### Normalize-as-unset resolver pattern
```ts
const SEEDED_PLACEHOLDER_PATHS = new Set([
  "/images/exercises/placeholders/exercise-unset.svg",
]);

function normalizeMediaPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return SEEDED_PLACEHOLDER_PATHS.has(path) ? null : path;
}

export function resolveExerciseMedia(input: ResolverInput): string {
  const normalizedPrimary = normalizeMediaPath(input.dbMediaPath);
  return (
    normalizedPrimary ??
    input.manifestIconPath ??
    "/images/exercises/placeholder.svg"
  );
}
```

See also: [Frontend Media Fallback Rendering Guardrails](./frontend/media-fallbacks.md).

## Common failure modes
- Guessing `/images/exercises/${slug}.svg` without manifest verification.
- Retrying known-missing asset URLs multiple times in one session.
- Build pipelines that skip manifest generation, creating drift between assets and lookup tables.
- Treating seeded placeholder defaults as valid media, preventing deterministic fallback selection.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-27, 2026-02-28 media fallback guardrails).
