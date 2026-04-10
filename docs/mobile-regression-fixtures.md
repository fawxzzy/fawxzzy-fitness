# Mobile regression fixtures

This fixture suite turns the known mobile regression inventory into deterministic route-level coverage and explicit review boards.

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

## Test runner

Run the fixture suite with:

```bash
npm run test:mobile-regression-fixtures
```
