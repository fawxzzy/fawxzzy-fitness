# Playbook Engine

Node CLI for the Playbook learning + governance loop.

## Commands

- `node ./tools/engine/cli.mjs run`
- `node ./tools/engine/cli.mjs status`
- `node ./tools/engine/cli.mjs promote`
- Add `--cwd=/path/to/repo` to run against an arbitrary repository root.
- `node ./tools/engine/pr-summary.mjs` (status-file dashboard formatter)

## Config (`playbook.config.json`)

Minimal format:

```json
{
  "notesPath": "docs/PLAYBOOK_NOTES.md",
  "trendPath": "docs/playbook-trend.json",
  "contracts": { "enabled": true },
  "thresholds": {
    "draftToProposed": 3,
    "proposedToPromoted": 5,
    "promotedToContract": 3,
    "missingFieldPolicy": "warn"
  }
}
```

All paths are repo-local and cross-platform (`path.resolve` based).

## Outputs

- `docs/playbook-trend.json`: historical run telemetry.
- `docs/playbook-status.json`: canonical machine-readable status artifact for local/CI/agent consumption.

Use `--verbose` to print the status file location after a run.

## Dashboard output

`pr-summary.mjs` and `format-dashboard.mjs` read `docs/playbook-status.json` and print a compact PR/CI dashboard block.

Use this formatter in CI and PR comment workflows to avoid duplicate counting logic.
