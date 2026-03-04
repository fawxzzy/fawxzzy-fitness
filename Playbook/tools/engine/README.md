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


## Smart Signals engine (`tools/engine/signals.mjs`)

The Smart Signals module provides deterministic draft metadata from git diff signals:

- Auto classification: `Principle | Guardrail | Pattern | Architecture Contract | Failure Mode`.
- Suggested doctrine location (`docs/CONTRACTS/*`, `docs/GUARDRAILS/*`, `docs/PATTERNS/*`) based on ordered mapping rules.
- Evidence extraction from meaningful paths (`app/`, `src/`, `components/`, `supabase/`, `docs/`, `tools/`).
- Failure-mode tags + architecture boundary flags.
- Confidence scoring (`0..1`) using weighted rule/evidence coverage.
- Duplicate detection against doctrine headings and notes.

### Safe extension rules for mapping table

When adding or editing `SIGNAL_RULES` in `tools/engine/signals.mjs`:

1. Keep rule ordering intentional. Earlier rules should be more specific than later fallback rules.
2. Use deterministic regex/path matching only (no network calls, no non-deterministic timestamps).
3. Always define `type`, `suggestedPlaybookFile`, and at least one tag/flag hint for each new rule.
4. Prefer contract/guardrail targets when a rule spans multiple doctrine layers.
5. Add or update fixtures in `tools/engine/fixtures/signals/` and test coverage in `tools/engine/signals.test.mjs`.
6. Preserve Windows-safe path handling by normalizing `\` to `/` before evaluating rules.

Use `node --test tools/engine/signals.test.mjs` to validate rule behavior before committing.
