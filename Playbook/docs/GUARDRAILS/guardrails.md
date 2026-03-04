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

<!-- PLAYBOOK_NOTE_ID:2026-03-04-playbook-sync-automation-should-resolve-integration-mode-explicitly-before-mutating-repos -->
### Playbook sync automation should resolve integration mode explicitly before mutating repos (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Repository automation that syncs shared doctrine should first resolve explicit integration modes (submodule, in-tree repo, external path) and enforce clean-working-tree preconditions before running git update commands.
Rationale: Prevents destructive or ambiguous sync behavior across different wiring models and makes one-command doctrine updates deterministic and auditable.
Evidence (FawxzzyFitness):
- scripts/playbook/playbook-path.mjs
- scripts/playbook/sync-playbook.mjs
- scripts/playbook/check-proposed-notes-threshold.mjs

<!-- PLAYBOOK_NOTE_ID:2026-03-04-validate-exercise-ids-at-client-open-and-api-entry-boundaries -->
### Validate exercise IDs at client-open and API-entry boundaries (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Exercise-browser surfaces should reject invalid/sentinel IDs both before opening detail UI and again at API route ingress, while filtering sentinel/legacy placeholders from source lists.
Rationale: Dual-boundary validation prevents malformed IDs from triggering noisy fetch failures and blocks legacy placeholder records from user-facing surfaces.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfo.tsx
- src/app/api/exercise-info/[exerciseId]/route.ts
- src/lib/exercises.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-04-use-defensive-exercise-display-fallbacks-in-list-uis -->
### Use defensive exercise-display fallbacks in list UIs (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Exercise list UIs should resolve display text through a prioritized candidate chain and fall back to a neutral label when canonical name fields are absent.
Rationale: Defensive fallback rendering prevents blank or broken list cards when heterogeneous payloads contain partial exercise name shapes.
Evidence (FawxzzyFitness):
- src/app/history/exercises/ExerciseBrowserClient.tsx
- src/app/history/session-summary.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-04-enforce-a-single-scroll-owner-for-bottom-action-compatibility -->
### Enforce a single scroll owner for bottom action compatibility (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Keep one `ScrollContainer` as the vertical scroll owner and mount `BottomActionsSlot` inside it, with development warnings when no scroll ancestor is found.
Rationale: Nested or missing scroll owners are a primary cause of clipped sticky/fixed actions and unreachable bottom content on mobile browsers.
Evidence (FawxzzyFitness):
- src/components/ui/app/ScrollContainer.tsx
- src/components/layout/ScrollScreenWithBottomActions.tsx
- src/components/layout/bottom-actions.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-treat-direct-bottomactionbar-mounting-as-framework-only -->
### Treat direct BottomActionBar mounting as framework-only (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: `BottomActionBar` usage should be limited to the shared slot/framework layer; screen or feature code should not mount it directly.
Rationale: Restricting direct mounts removes duplicate fixed/sticky bars and enforces one architectural path for bottom action rendering.
Evidence (FawxzzyFitness):
- src/components/layout/bottom-actions.tsx
- src/components/ui/BottomActionBar.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-resolve-effective-exercise-modality-from-metric-signal-not-metadata-alone -->
### Resolve effective exercise modality from metric signal, not metadata alone (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: When measurement metadata suggests cardio, UI classification should still require positive duration or distance signal before rendering cardio-mode summaries or Best lines.
Rationale: Prevents stale/incorrect metadata from causing strength histories to display cardio-only summaries and keeps modality decisions deterministic across surfaces.
Evidence (FawxzzyFitness):
- src/lib/cardio-best.ts
- src/lib/exercises-browser.ts
- src/lib/exercise-info.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-03-portal-viewport-fixed-bottom-action-bars-out-of-overflow-scrollers -->
### Portal viewport-fixed bottom action bars out of overflow scrollers (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Any `position: fixed` bottom action bar should render through a top-level portal layer (`document.body`) while the screen’s single scroll owner reserves bottom space via the shared reserve class.
Rationale: Nested overflow containers (especially iOS WebKit) can break fixed anchoring/clipping, causing last-row overlap even when reserve padding exists.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/app/routines/[id]/days/[dayId]/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/app/session/[id]/page.tsx
- src/components/SessionTimers.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-standardize-fixed-cta-spacing-through-one-shared-reserve-token -->
### Standardize fixed CTA spacing through one shared reserve token (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: When using viewport-fixed bottom CTAs, export and reuse one shared reserve class constant on the existing route scroll owner instead of screen-specific `pb-*` compensation.
Rationale: Prevents overlap/dead-zone drift and keeps bottom-safe-area behavior consistent across screens without changing scroll ownership.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/app/routines/page.tsx
- src/app/routines/[id]/days/[dayId]/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/app/session/[id]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-enforce-mobile-safe-area-contracts-with-a-single-scroll-owner-reserve -->
### Enforce mobile safe-area contracts with a single scroll-owner reserve (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Keep top/bottom viewport spacing deterministic by letting the page shell own both top inset/header offset and bottom fixed-bar reserve, and remove per-screen spacing compensation.
Rationale: Mixed ownership of safe-area offsets causes phantom top gaps, content overlap under fixed bars, and inconsistent dead space across routes.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppShell.tsx
- src/components/ui/BottomActionBar.tsx
- src/app/history/[sessionId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-portal-dropdowns-menus-out-of-glass-card-stacking-contexts -->
### Portal dropdowns/menus out of glass/card stacking contexts (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Interactive overlays (dropdowns, popovers, context menus) must render through a top-level portal layer rather than inside card/glass containers that may create clipping or stacking contexts.
Rationale: Prevents mobile overlay clipping, z-index fights, and awkward menu overlap when parent containers use blur, overflow, or local stacking contexts.
Evidence (FawxzzyFitness):
- src/components/ui/app/ViewModeSelect.tsx
- src/app/history/HistorySessionsClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-app-shell-should-own-top-nav-placement-variables -->
### App shell should own top-nav placement variables (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Treat app-level top spacing as a single `AppShell` contract (`--app-nav-top`, `--app-nav-h`, `--app-content-top`) and make nav components consume only those shell-scoped vars.
Rationale: Prevents competing safe-area/header offset sources from creating route-specific whitespace drift and notch/header overlap bugs.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppShell.tsx
- src/components/AppNav.tsx
- src/app/globals.css

<!-- PLAYBOOK_NOTE_ID:2026-03-03-portaled-sticky-bottom-actions-must-pair-with-conditional-scroll-owner-reserve -->
### Portaled sticky bottom actions must pair with conditional scroll-owner reserve (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: When bottom actions are viewport-pinned via portal/fixed positioning, reserve padding must be owned by the single scroll container and applied only when actions are actually present.
Rationale: Keeps always-visible mobile CTAs reliable while preventing both content overlap and unnecessary bottom dead-space on routes without actions.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/components/layout/ScrollScreenWithBottomActions.tsx
- src/components/layout/bottom-actions.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-prioritize-deterministic-reserve-when-portaled-bottom-actions-are-introduced -->
### Prioritize deterministic reserve when portaled bottom actions are introduced (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: When migrating sticky actions to viewport-pinned portal/fixed behavior, default to always-on scroll-owner reserve until publish timing and mount order are proven stable.
Rationale: Prevents final-content overlap regressions during hydration/transition edges where action presence may publish late.
Evidence (FawxzzyFitness):
- src/components/layout/ScrollScreenWithBottomActions.tsx
- src/components/layout/bottom-actions.tsx
- src/components/ui/BottomActionBar.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-cardio-best-rows-should-be-gated-by-metric-signal-and-explicit-measurement-type -->
### Cardio Best rows should be gated by metric signal and explicit measurement type (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Cardio Best UI rows should render only when canonical cardio measurement metadata and selected best metric data are present; strength rows should omit Best placeholders entirely.
Rationale: Prevents mixed-modality card regressions where strength rows show cardio “Best” placeholders and keeps summary lines meaningful.
Evidence (FawxzzyFitness):
- src/lib/cardio-best.ts
- src/lib/exercises-browser.ts
- src/lib/exercise-info.ts
- src/app/history/exercises/ExerciseBrowserClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-do-not-infer-cardio-modality-from-incidental-set-metrics-on-strength-exercises -->
### Do not infer cardio modality from incidental set metrics on strength exercises (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Cardio-vs-strength rendering should key from canonical `measurement_type`; duration/distance values in sets must not upcast non-cardio exercises into cardio UI paths.
Rationale: Prevents strength cards from showing cardio-only Best rows when set payloads contain incidental timing/distance noise.
Evidence (FawxzzyFitness):
- src/lib/cardio-best.ts
- src/lib/exercises-browser.ts
- src/lib/exercise-info.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-04-standardize-api-error-envelopes-with-request-phase-correlation-metadata -->
### Standardize API error envelopes with request/phase correlation metadata (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: API routes should emit a consistent error envelope containing `requestId` and `step`, and mirror those fields in response headers for cross-boundary debugging.
Rationale: A fixed envelope prevents ad hoc error shapes, makes client-side diagnostics deterministic, and improves production incident traceability without repro.
Evidence (FawxzzyFitness):
- src/app/api/exercise-info/[exerciseId]/route.ts
- src/components/ExerciseInfo.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-standardize-bottom-action-slot-and-publish-contracts -->
### Standardize bottom-action slot and publish contracts (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Recent git changes indicate a bottom actions learning candidate touching 1 file(s). Capture this as draft guidance for review before promotion.
Rationale: Bottom action ownership drift causes sticky/fixed regressions that are expensive to catch late.
Evidence (FawxzzyFitness):
- Playbook/docs/CONTRACTS/BOTTOM_ACTIONS_OWNERSHIP.md

<!-- PLAYBOOK_NOTE_ID:2026-03-04-literalize-layout-critical-tailwind-arbitrary-value-classes -->
### Literalize layout-critical Tailwind arbitrary-value classes (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Recent git changes indicate a tailwind extraction learning candidate touching 2 file(s). Capture this as draft guidance for review before promotion.
Rationale: Literal class strings keep Tailwind extraction deterministic for spacing-critical utilities.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfoSheet.tsx
- src/components/ui/BottomActionBar.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-standardize-api-error-envelopes-and-request-tracing-metadata -->
### Standardize API error envelopes and request tracing metadata (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: Recent git changes indicate a api observability learning candidate touching 5 file(s). Capture this as draft guidance for review before promotion.
Rationale: Shared envelope and trace metadata improve incident triage and keep route contracts deterministic.
Evidence (FawxzzyFitness):
- Playbook/docs/CHANGELOG.md
- Playbook/docs/CONSUMPTION.md
- Playbook/docs/WORKFLOWS/ai-audit.md
- Playbook/docs/WORKFLOWS/playbook-ci.md
- Playbook/tools/doctor/cli.mjs
