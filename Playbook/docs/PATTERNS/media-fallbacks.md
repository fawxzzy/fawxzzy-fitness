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

## Common failure modes
- Guessing `/images/exercises/${slug}.svg` without manifest verification.
- Retrying known-missing asset URLs multiple times in one session.
- Build pipelines that skip manifest generation, creating drift between assets and lookup tables.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-27, 2026-02-28 media fallback guardrails).
