# Pattern: Frontend Media Fallback Rendering Guardrails

[Back to Index](../../INDEX.md)

## Problem
Conditionally hiding media sections based on placeholder checks can produce blank states even when safe fallback assets are available.

## Guardrails

## 2026-03-01 — Never conditionally suppress media sections when fallback assets are valid UX
- **Type:** Guardrail
- **Status:** Proposed
- **Summary:** If a media slot has a canonical resolver plus safe placeholder fallback, UI surfaces MUST render the slot and let the image component degrade to placeholder rather than hiding the entire section.
- **Rationale:** Gating section render on “non-placeholder” checks can regress into blank UI states and break consistency across list/detail surfaces.
- **Evidence:** `src/components/ExerciseInfoSheet.tsx`, `src/lib/exerciseImages.ts`, `src/components/ExerciseAssetImage.tsx`
- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-03-01 render-then-degrade media guardrail).

### Do
- Always render the media section when the slot is part of the product contract.
- Route all source selection through one canonical resolver.
- Let the image component own runtime degrade behavior (`onError` -> placeholder) without panel suppression.

### Don’t
- Gate panel render with `if (resolvedSrc && !isPlaceholder(resolvedSrc))`.
- Diverge list/detail rendering rules for the same media slot.

### Render-then-degrade pattern
```tsx
const imageSrc = resolveExerciseMedia({ ...input });

return (
  <section aria-label="Exercise media">
    <ExerciseAssetImage src={imageSrc} alt={exerciseName} />
  </section>
);
```

### Anti-pattern
```tsx
if (!imageSrc || isSeededPlaceholder(imageSrc)) {
  return null; // Avoid: hides a valid fallback UX surface.
}
```

See also: [Media Manifests and Deterministic Fallbacks](../media-fallbacks.md).

## Common failure modes
- Placeholder checks used as render gates rather than source normalization.
- Inconsistent slot visibility between list cards and detail panels.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-03-01 media section rendering guardrail).
