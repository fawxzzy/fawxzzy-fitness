# Mobile Regression Extraction Contract

## Purpose

Define the canonical ownership and public boundary for the extracted mobile-regression QA surface.

## Canonical sources

- Scenario inventory and review-family to board-output mapping live in `src/features/mobile-regression/fixtures.ts`.
- Scenario contract validation lives in `src/features/mobile-regression/contracts.ts`.
- Board-generation implementation lives in `scripts/mobile_regression/board_builder.py`.
- Consolidated mobile-regression tests live under `tests/mobile-regression/`.
- The builder script is an implementation surface, not the canonical source of review-family output mapping.

## Manifest and input boundary

- `scripts/qa-matrix.mjs` is the repo-owned manifest producer for the mobile-regression board flow.
- Repo-generated `manifest.json` snapshots are expected to publish:
  - `widths`
  - `reviewFamilies`
  - `scenarios`
- `reviewFamilies` is the manifest-owned serialization of the fixture-owned board contract.
- Each `reviewFamilies[]` entry must define:
  - `family`
  - `boardFile`
- `scenarios[].family` assigns a scenario to a review family, but does not own board-output file naming by itself.
- `scripts/mobile_regression/board_builder.py` consumes `manifest.reviewFamilies` as the authoritative family/output map and validates scenario families against that manifest-owned list.
- Do not introduce a second repo-local source of truth for family/output mapping inside the builder or adjacent scripts.
- Older local or manual manifests that omit `reviewFamilies` may still be accepted through the builder's legacy fallback.
- That fallback is a temporary compatibility bridge while older manifests age out; it is not the long-term contract.

## Stable CLI boundary

- `npm run qa:boards` remains the public board-generation entrypoint.
- `scripts/build-mobile-regression-boards.py` remains the CLI-facing wrapper for that command.
- The wrapper delegates directly to `mobile_regression.board_builder.main`.
- Internal automation and tests may rely on the wrapper path until an explicit cutover retires it.

## Import boundary

- `src/features/mobile-regression/fixtures.ts`
- `src/features/mobile-regression/contracts.ts`
- Consumers that need review-family output mapping should import the fixture-owned definitions or read the repo-generated manifest shape, not re-declare the mapping elsewhere.
- Do not add or document separate TypeScript compatibility re-export layers for this slice.

## Test and verification boundary

- The canonical fixture suite is the consolidated `tests/mobile-regression/*` set.
- Docs, tooling, and follow-on edits should reference only the consolidated `tests/mobile-regression/*` suite.
- Targeted harness parity typechecking lives in `tsconfig.mobile-regression.json`.
- Repo verification remains `npm run verify`.
- Mobile-regression fixture verification remains `npm run test:mobile-regression-fixtures`.
- Mobile-regression harness parity verification remains `npm run verify:mobile-regression`.

## Non-goals

- This contract does not retire `scripts/build-mobile-regression-boards.py`.
- This contract does not make the legacy manifest fallback permanent.
- Any future wrapper removal must be an explicit CLI cutover, not an opportunistic cleanup.
- Any future fallback removal should happen only after repo-generated manifests are uniformly sourced from the updated `qa-matrix` lane.
