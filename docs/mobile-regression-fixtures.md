# Mobile regression fixtures

This fixture suite turns the known mobile regression inventory into deterministic route-level coverage and explicit review boards.

Boundary ownership and public entrypoints are documented in `docs/MOBILE-REGRESSION-EXTRACTION-CONTRACT.md`.

## Review buckets

The board pipeline uses scenario-owned family metadata, not filename-prefix guessing. The review buckets are:

- `Exercise cards`
- `Session / logging`
- `Session summaries`
- `Settings / detail`

Current review order for the final symmetry pass:

1. `session-logging-board.png`
2. `exercise-cards-board.png`
3. `session-summaries-board.png`
4. `settings-detail-board.png`

## Capture and board flow

Capture screenshots and emit the manifest:

```bash
npm run qa:matrix
```

Build the review boards from the manifest:

```bash
npm run qa:boards
```

The capture step writes `.codex/qa/mobile-regression/manifest.json` beside the screenshots. The board builder reads that manifest and writes:

- `mega-board.png`
- `exercise-cards-board.png`
- `session-logging-board.png`
- `session-summaries-board.png`
- `settings-detail-board.png`

Local QA note: the board builder uses Pillow. If it is missing, install it once with `python -m pip install Pillow`.

## Permanent visual state registry

The canonical visual catalog is owned by `scripts/qa/visual-fitness-state-registry.mjs`. It is the only place that defines the accepted semantic-state and raw-capture denominators for signed-in fixtures, public routes, auth/loading states, and curated onboarding.

Current accepted coverage:

- 111 semantic states
- 313 raw captures
- 60 signed-in mobile-regression states
- 9 public/legal/install states
- 11 auth/loading states
- 31 curated-onboarding states

Inspect and validate the registry without starting a browser:

```bash
npm run visual:fitness:registry
```

Run the bounded cross-family smoke catalog:

```bash
npm run qa:dev:fresh
npm run visual:fitness:catalog:smoke
```

Run the full catalog:

```bash
npm run qa:dev:fresh
npm run visual:fitness:catalog
```

Every registry run writes a source-bound catalog manifest, coverage report, count-delta ledger, environment receipt, failure report, per-capture receipts, per-family boards, a mega-board, and a hashed board receipt. The runner records the requested and resolved route independently so redirects cannot silently make a capture appear valid.

The capture environment is pinned to the shared registry contract: Chromium or Edge, dark theme, device scale 1, `en-US`, reduced motion, the `America/New_York` timezone, and disabled CSS animation. Registry captures use only deterministic fixture surfaces, public routes, or synthetic onboarding local state. They must not contain live user data, raw identifiers, credentials, tokens, console payloads, or provider responses.

### Adding or changing a state

1. Update the existing registry entry or add one semantic state with a stable namespaced ID.
2. Declare route, expected resolved-route contract, auth mode, fixture owner, setup, viewport variants, assertions, and deterministic output filenames.
3. Update the accepted count ledger deliberately. A silent denominator reduction fails closed.
4. Extend registry, suite-adapter, runner, and board tests for the new contract or failure mode.
5. Run the smoke catalog before the full catalog.
6. Review the family board and mega-board together with the manifest and board receipt.

Do not create a second route list inside a capture script. The runner and board pipeline must consume the shared registry. Temporary catalogs are evidence for one source state; they are not a durable registry and become stale when the source head, registry digest, browser environment, or fixture contract changes.

### Baselines and CI

Large screenshots and boards are runtime artifacts, not source files. Store approved baselines in the governed external CI artifact store and retain a small committed manifest of source commit, tree, registry digest, environment identity, capture IDs, and SHA-256 values when baseline comparison is admitted. Never commit generated screenshots just to make a visual test pass.

Use the smoke tier for pull-request validation after its runtime and artifact storage are admitted. Use the full 313-capture catalog for scheduled or release-candidate review. A failed assertion, unexpected resolved route, missing screenshot, duplicate capture, orphan capture, digest mismatch, or count drift is a failed catalog, not a candidate for automatic baseline replacement.

This pipeline inventories and proves visual states. It does not authorize product UI cleanup, fixture-driven production behavior changes, deployment, or baseline approval.

## Test runner

Run the fixture suite with:

```bash
npm run test:mobile-regression-fixtures
```
