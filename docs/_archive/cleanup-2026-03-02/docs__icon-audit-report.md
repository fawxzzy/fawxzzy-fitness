# Exercise ↔ Icon Audit Report

## Canonical sources
- Canonical exercise list chosen: `supabase/data/global_exercises_canonical.json` (seed source for global exercise catalog consumed by DB-backed Exercise Browser).
- Canonical slug rule: `slugifyExerciseName` from app logic (lowercase, whitespace/underscore -> hyphen, strip non-alnum except hyphen).
- Current icon resolver contract: `src/lib/exerciseImages.ts` via manifest lookup first (slug), then fallback to name-slug lookup, else placeholder.
- Icon directory audited (case-sensitive): `public/exercises/icons/`.

## Summary
- Canonical exercises scanned: 136
- PNG files scanned: 149
- Bucket 1 (new exact icon exists but not currently mapped): 17
- Bucket 2a (off-by-name, high-confidence): 0
- Bucket 2b (off-by-name, ambiguous): 1
- Bucket 3 (imageless): 20

## Deterministic matching policy
- Exact match: `<canonical_slug>.png` is authoritative.
- Near match scoring: token overlap + normalized edit distance + containment + prefix ratio.
- Auto-suggest threshold: >= 0.92 with runner-up < 0.85.
- Imageless threshold: no candidate >= 0.75 and current mapping is placeholder.

## Outputs
- `artifacts/icon-audit/bucket-1-new-icons.csv`
- `artifacts/icon-audit/bucket-2-off-by-name.csv`
- `artifacts/icon-audit/bucket-3-imageless.csv`
- `artifacts/icon-audit/all-icons-index.csv`
- Proposed renames: none

## Next actions
1. Review bucket 2 ambiguous rows and choose canonical filenames manually.
2. If approving bucket 2a suggestions, run proposed rename commands in a separate explicit PR.
3. Re-run `npm run audit:exercise-icons` after any icon file changes.
