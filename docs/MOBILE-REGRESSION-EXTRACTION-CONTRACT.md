# Mobile Regression Extraction Contract

## Purpose

Define the canonical ownership and public boundary for the extracted mobile-regression QA surface.

## Canonical sources

- Scenario inventory lives in `src/features/mobile-regression/fixtures.ts`.
- Scenario contract validation lives in `src/features/mobile-regression/contracts.ts`.
- Board-generation implementation lives in `scripts/mobile_regression/board_builder.py`.
- Consolidated mobile-regression tests live under `tests/mobile-regression/`.

## Stable CLI boundary

- `npm run qa:boards` remains the public board-generation entrypoint.
- `scripts/build-mobile-regression-boards.py` remains the CLI-facing wrapper for that command.
- The wrapper delegates directly to `mobile_regression.board_builder.main`.
- Internal automation and tests may rely on the wrapper path until an explicit cutover retires it.

## Import boundary

- `src/features/mobile-regression/fixtures.ts`
- `src/features/mobile-regression/contracts.ts`
- Do not add or document separate TypeScript compatibility re-export layers for this slice.

## Test and verification boundary

- The canonical fixture suite is the consolidated `tests/mobile-regression/*` set.
- Docs, tooling, and follow-on edits should reference only the consolidated `tests/mobile-regression/*` suite.
- Repo verification remains `npm run verify`.
- Mobile-regression fixture verification remains `npm run test:mobile-regression-fixtures`.

## Non-goals

- This contract does not retire `scripts/build-mobile-regression-boards.py`.
- Any future wrapper removal must be an explicit CLI cutover, not an opportunistic cleanup.
