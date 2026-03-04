# Guardrails Catalog

## Guardrail template
Type:
Status:
Summary:
Invariant:
Rationale:
Failure Mode:
Verification Method:
Related Patterns:
Last Updated:


## Resolve cached and aggregated stats by canonical entity ID
Type: Data
Status: Proposed
Summary: Cached and aggregated stats must be resolved through canonical entity IDs at render boundaries.
Invariant: Wrapper/transient IDs are never used for canonical cache lookups.
Rationale: Mixed ID domains silently hide valid cached stats.
Failure Mode: Last/PR values appear missing despite existing canonical records.
Verification Method: Review resolver usage at UI and route boundaries plus deterministic cache key tests.
Related Patterns: [deterministic-reversible-state](../PATTERNS/deterministic-reversible-state.md)
Last Updated: 2026-03-02

## History exercise browsers use canonical catalog loader
Type: Architectural
Status: Proposed
Summary: Browsing and selection surfaces must share one canonical catalog loader, then layer optional user stats separately.
Invariant: Catalog source remains identical across Add Exercise and History flows.
Rationale: Independent catalog queries create drift and inconsistent inventory visibility.
Failure Mode: One surface shows partial catalog while others show full canonical set.
Verification Method: Trace catalog loading path and batch stats enrichment by canonical IDs.
Related Patterns: [deterministic-reversible-state](../PATTERNS/deterministic-reversible-state.md), [cache-and-revalidation](../PATTERNS/cache-and-revalidation.md)
Last Updated: 2026-03-02

## Reuse one measurement-to-goal payload mapper
Type: API
Status: Proposed
Summary: All create flows must use one canonical measurement-to-goal payload parser.
Invariant: Shared UI input maps to identical persisted goal payloads.
Rationale: Duplicate mappers drift and persist incompatible data.
Failure Mode: Routine and session creation persist mismatched goal payloads.
Verification Method: Assert parser reuse and parity tests across flows.
Related Patterns: [deterministic-reversible-state](../PATTERNS/deterministic-reversible-state.md)
Last Updated: 2026-03-02

## Recompute derived caches after additive and destructive mutations
Type: Data
Status: Proposed
Summary: Derived performance caches must be recomputed after both writes and deletes/edits.
Invariant: Cache maintenance is symmetric for all mutation classes.
Rationale: Add-only recompute leaves stale claims after destructive updates.
Failure Mode: Historical metrics disagree with underlying records.
Verification Method: Validate touched canonical IDs are recomputed after each mutation path.
Related Patterns: [deterministic-reversible-state](../PATTERNS/deterministic-reversible-state.md)
Last Updated: 2026-03-02

## Degrade derived cache reads safely during schema lag
Type: Data
Status: Proposed
Summary: Optional derived cache reads must degrade to null-enriched base data when migration lag causes relation/column errors.
Invariant: Required base entity reads do not fail because optional cache tables are unavailable.
Rationale: Migration lag is expected; optional derived caches must not take routes down.
Failure Mode: Route render fails on missing optional cache relations.
Verification Method: Confirm guarded fallback for relation/column errors and rethrow of unexpected errors.
Related Patterns: [cache-and-revalidation](../PATTERNS/cache-and-revalidation.md)
Last Updated: 2026-03-02

## API errors ship phase and correlation metadata
Type: API
Status: Proposed
Summary: Multi-step API error responses include deterministic phase and request correlation metadata.
Invariant: Error payload and headers expose requestId and phase without leaking sensitive internals.
Rationale: Operational metadata reduces diagnosis time while preserving safety.
Failure Mode: Client-visible errors cannot be correlated to server diagnostics.
Verification Method: Validate error JSON shape and `x-request-id` header presence.
Related Patterns: [ci-guardrails-and-verification-tiers](../PATTERNS/ci-guardrails-and-verification-tiers.md)
Last Updated: 2026-03-02

## One canonical renderer and resolver for repeated detail surfaces
Type: UI
Status: Proposed
Summary: Multi-entry detail flows must route through one shared renderer and one shared resolver keyed by canonical ID.
Invariant: Detail layout and data shape are consistent across entry points.
Rationale: Forked detail implementations drift in sections and fallback behavior.
Failure Mode: Inconsistent detail content between navigation paths.
Verification Method: Ensure all entry flows call the same UI module and resolver contract.
Related Patterns: [ui-controller-separation](../PATTERNS/ui-controller-separation.md)
Last Updated: 2026-03-02

## Keep token refresh in middleware
Type: Architectural
Status: Proposed
Summary: Token refresh must remain middleware-owned to preserve deterministic server authentication boundaries.
Invariant: Token refresh logic is not duplicated across random handlers.
Rationale: Distributed refresh logic creates state races and auth inconsistency.
Failure Mode: Inconsistent session behavior across server execution paths.
Verification Method: Audit refresh ownership and ensure middleware is sole refresh authority.
Related Patterns: [server-client-boundaries](../PATTERNS/server-client-boundaries.md)
Last Updated: 2026-03-02

## Use deterministic sync reports instead of auto-renaming media files
Type: Data
Status: Proposed
Summary: Media sync should report conflicts deterministically rather than mutating canonical names automatically.
Invariant: Canonical media identifiers remain stable during sync operations.
Rationale: Auto-renaming introduces hidden divergence and weak traceability.
Failure Mode: Media references drift across environments after conflict resolution.
Verification Method: Verify sync output is report-first and avoids implicit canonical renames.
Related Patterns: [media-fallbacks](../PATTERNS/media-fallbacks.md)
Last Updated: 2026-03-02

## Treat seeded placeholder defaults as unset in resolvers
Type: UI
Status: Proposed
Summary: Placeholder seed values are treated as unset inputs so fallback resolution can choose canonical assets deterministically.
Invariant: Placeholder defaults never block canonical fallback logic.
Rationale: Placeholder-as-value semantics can suppress valid fallback behavior.
Failure Mode: Valid media fallback assets are skipped.
Verification Method: Validate resolver behavior for placeholder seed inputs.
Related Patterns: [media-fallbacks](../PATTERNS/media-fallbacks.md)
Last Updated: 2026-03-02

## Never suppress media sections when fallback assets are valid
Type: UI
Status: Proposed
Summary: Media sections remain rendered and rely on image-level degradation instead of section-level suppression.
Invariant: Canonical media slots remain visible when fallback assets exist.
Rationale: Conditional section suppression creates avoidable blank states.
Failure Mode: List/detail surfaces diverge with missing media panels.
Verification Method: Confirm section render is unconditional for canonical slots and fallback occurs at component level.
Related Patterns: [media-fallbacks](../PATTERNS/media-fallbacks.md)
Last Updated: 2026-03-02

## Enforce one vertical scroll owner per app page shell
Type: UI
Status: Proposed
Summary: App page shells should have one vertical scroll container to prevent nested scroll conflict.
Invariant: Scroll ownership is singular per page shell.
Rationale: Nested scrollers break gesture predictability and accessibility.
Failure Mode: Scroll lock, jitter, or hidden content in mobile flows.
Verification Method: Inspect shell/container composition for nested vertical scroll regions.
Related Patterns: [mobile-interactions-and-navigation](../PATTERNS/mobile-interactions-and-navigation.md)
Last Updated: 2026-03-02

## Pair sticky bottom CTA with conditional content padding
Type: UI
Status: Proposed
Summary: Sticky bottom CTA surfaces must reserve conditional bottom padding so content remains reachable.
Invariant: Action bars do not occlude interactive content.
Rationale: Sticky controls without compensating padding hide form/content tails.
Failure Mode: Users cannot access or review final content below CTA.
Verification Method: Validate viewport behavior with and without sticky CTA in long flows.
Related Patterns: [mobile-interactions-and-navigation](../PATTERNS/mobile-interactions-and-navigation.md)
Last Updated: 2026-03-02

## Enforce mobile safe-area contracts with a single scroll-owner reserve
Type: UI
Date: 2026-03-03
Status: Proposed
Summary: Keep top/bottom viewport spacing deterministic by letting the page shell own both top inset/header offset and bottom fixed-bar reserve, and remove per-screen spacing compensation.
Invariant: Safe-area and fixed-bar spacing are allocated by one shell-level owner.
Rationale: Mixed ownership of safe-area offsets causes phantom top gaps, content overlap under fixed bars, and inconsistent dead space across routes.
Failure Mode: Route-specific spacing hacks accumulate and produce unstable layout behavior across mobile screens.
Evidence: src/components/ui/app/AppShell.tsx, src/components/ui/BottomActionBar.tsx, src/app/history/[sessionId]/page.tsx
Verification Method: Confirm page routes avoid local `pt-safe`/`pb-safe` compensation when shell reserves top and bottom spacing.
Implementation Notes:
- **Do:** Keep top inset/header offset and bottom fixed-bar reserve in `AppShell`/shared shell CSS vars.
- **Do:** Let page content render naturally inside shell-provided padding contracts.
- **Don't:** Add per-screen safe-area padding compensation when shell reserve is active.
- Snippet:
  ```css
  .app-content {
    padding-top: var(--app-top-inset);
    padding-bottom: var(--app-bottom-reserve);
  }
  ```
Related Patterns: [mobile-interactions-and-navigation](../PATTERNS/mobile-interactions-and-navigation.md)
Last Updated: 2026-03-03

### Pattern: Literalize Layout-Critical Tailwind Arbitrary Classes

Problem
Template-interpolated Tailwind arbitrary-value classes can be missed by extraction, causing critical spacing rules to disappear in production builds.

Solution
Keep layout-critical arbitrary-value utilities as literal class strings (and safelist when needed) so build-time extraction is deterministic.

Implementation Guidance
- Store classes like `pb-[calc(...)]` as literal constants, not runtime string templates.
- Safelist known critical classes when they may be assembled indirectly.
- Apply this guardrail specifically to spacing that prevents overlap with sticky/fixed UI.

Example
`src/components/ui/BottomActionBar.tsx` defines reserve padding classes literally and `tailwind.config.ts` safelists the class used to preserve bottom-action spacing.

Why It Matters
Deterministic class extraction prevents hidden layout regressions where scroll content is clipped behind fixed mobile action bars.

