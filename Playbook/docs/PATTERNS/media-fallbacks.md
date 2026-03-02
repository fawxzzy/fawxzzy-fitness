# Pattern: Media Manifests and Deterministic Fallbacks

[Back to Index](../INDEX.md)

## Problem
Slug-based static media lookup can generate repeated 404 requests when paths are guessed optimistically instead of validated against known assets.

## Context
- Used when UI resolves media from static assets plus optional DB paths.
- Assumes asset coverage is incomplete and placeholders are expected.
- Requires consistent behavior across list/detail surfaces.

## Solution
- Generate canonical manifests from approved asset folders.
- Gate runtime lookups through manifest entries only.
- Normalize seeded placeholder defaults as unset values.
- Apply deterministic fallback order before render.
- Keep media sections rendered and degrade at image component level on load error.

## Tradeoffs
- Manifest generation adds build/sync maintenance.
- Strict gating can expose missing-asset debt quickly.
- Shared resolver logic requires disciplined reuse across surfaces.

## Example
If DB media path is a seeded placeholder, resolver falls back to manifest icon; if image load fails, component swaps to safe placeholder without hiding the media section.

## When to use
- Static media assets are resolved by slug or canonical key.
- UI must degrade predictably when specific assets are missing.

## When NOT to use
- Media is always resolved through strongly versioned APIs with no local static fallback path.

## Implementation outline
- Keep manifest generation deterministic and source-controlled or reproducible in CI.
- Centralize resolver logic so all surfaces share the same normalization and fallback order.
- Add session-scoped known-missing URL suppression where noisy retry behavior appears.

## Related guardrails
- [Use deterministic sync reports instead of auto-renaming media files](../GUARDRAILS/guardrails.md#use-deterministic-sync-reports-instead-of-auto-renaming-media-files)
- [Treat seeded placeholder defaults as unset in resolvers](../GUARDRAILS/guardrails.md#treat-seeded-placeholder-defaults-as-unset-in-resolvers)
- [Never suppress media sections when fallback assets are valid](../GUARDRAILS/guardrails.md#never-suppress-media-sections-when-fallback-assets-are-valid)

## Common failure modes
- Guessing URLs without manifest verification.
- Retrying known-missing URLs repeatedly in one session.
- Treating seeded placeholders as canonical media inputs.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-27, 2026-02-28 media fallback guardrails).
