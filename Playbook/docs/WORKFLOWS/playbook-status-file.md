# Playbook Status File (`docs/playbook-status.json`)

## Purpose

`docs/playbook-status.json` is the canonical machine-readable status artifact for the Playbook engine.

- Local runs (`npm run playbook`) MUST write it every run.
- CI summaries MUST read this file instead of recomputing counts.
- AI agents MUST read this file before proposing or generating patches.

## File location

- Repository-local path: `docs/playbook-status.json`

## Stability guarantees

- Schema version is declared in `version` (major.minor).
- Fields are additive by default.
- Existing fields will not be removed or repurposed without a major version bump.
- JSON output uses stable key ordering and atomic write semantics (`tmp` + rename).

## JSON shape (v1.0)

```json
{
  "version": "1.0",
  "generatedAt": "2026-03-04T12:34:56.789Z",
  "engine": {
    "name": "playbook-engine",
    "version": "0.0.0",
    "commit": "abcdef123456",
    "statusSchemaVersion": "1.0"
  },
  "repo": { "root": "/abs/or/relative/path", "name": "Playbook" },
  "knowledge": {
    "draft": { "count": 0 },
    "proposed": { "count": 0 },
    "promoted": { "count": 0 }
  },
  "contracts": {
    "summary": { "pass": 0, "warn": 0, "fail": 0 },
    "byContract": [
      { "id": "SERVER_CLIENT_BOUNDARY", "status": "pass", "violations": 0 }
    ]
  },
  "recommendation": {
    "nextCommand": "npm run playbook",
    "reason": "string",
    "suggestedWhen": "now"
  }
}
```

## Field meanings

- `version`: status schema version for this artifact.
- `generatedAt`: UTC ISO timestamp when the engine produced this artifact.
- `engine`: tool metadata.
  - `name`: engine identifier.
  - `version`: engine semver from `package.json`.
  - `commit`: source commit (short SHA when available).
  - `statusSchemaVersion`: schema version echoed by engine metadata.
- `repo`: repository metadata.
  - `root`: resolved repository root used by the run.
  - `name`: repo folder name.
- `knowledge`: lifecycle counts currently surfaced for decision-making.
  - `draft.count`
  - `proposed.count`
  - `promoted.count`
- `contracts.summary`: normalized PASS/WARN/FAIL counts.
- `contracts.byContract`: per-contract status rows.
  - `id`: contract identifier/check key.
  - `status`: one of `pass`, `warn`, `fail`.
  - `violations`: numeric violations signal (0 for pass).
- `recommendation`: next action selected by engine policy.
  - `nextCommand`: runnable command string.
  - `reason`: short rationale.
  - `suggestedWhen`: one of `now`, `before_pr`, `before_merge`.

## Schema

Machine schema is defined at:

- `tools/schemas/playbook-status.schema.json`
