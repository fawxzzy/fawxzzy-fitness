# Fitness Release Ledger

This directory holds the canonical Fitness release history.

Release evidence is split into three layers:

1. `docs/releases/RELEASE_LEDGER.jsonl`
   Machine-readable source of truth for production release facts.
2. `docs/releases/fitness/YYYY/*.md`
   Human-readable release notes for each recorded production push.
3. `CHANGELOG.md`
   Short user-facing rollup for shipped releases.

## Why this exists

Planning docs, QA captures, commits, and chat summaries are not enough to answer release questions reliably.

This ledger is meant to answer:

- What changed since the last production push?
- What shipped in a specific version?
- Which FIT lanes, migrations, flags, tests, and artifacts were part of that push?
- Which known gaps remained at release time?

## Files

- `RELEASE_LEDGER.jsonl`
  Canonical machine-readable stream of release entries. One JSON object per line.
- `templates/fitness-release-note.md`
  Draft template used by the release-note generator.
- `fitness/YYYY/*.md`
  Generated markdown release notes grouped by year.

## Local draft input

The release generator uses a local-only draft file at:

- `runtime/fitness/release-draft.json`

That file is not canonical release history. It is a working draft used to fill in:

- previousCommit (optional first-release/backfill override)
- summary
- lanes
- user-facing changes
- internal changes
- verification
- artifacts
- known gaps
- deployment URLs
- feature flags

## Commands

```powershell
npm run release:fitness:prepare
npm run release:fitness:diff
npm run release:fitness:record
```

### `release:fitness:prepare`

- Creates `runtime/fitness/release-draft.json` if it does not exist.
- Detects the current branch and commit.
- Looks up the previous recorded Fitness production release from the JSONL ledger.
- Generates or refreshes the draft markdown note under `docs/releases/fitness/YYYY/`.
- If no previous ledger entry exists yet, the diff falls back to the current `HEAD` commit unless `previousCommit` is set manually in the draft file.

### `release:fitness:diff`

- Shows the current release diff scope and changed areas without recording a release.

### `release:fitness:record`

- Validates that the draft has real release data, not placeholders.
- Appends a JSONL ledger entry.
- Updates the root `CHANGELOG.md`.
- Writes the final markdown release note.

## Ledger fields

Each JSONL entry records:

- `version`
- `app`
- `environment`
- `branch`
- `commit`
- `previousCommit`
- `deployedAt`
- `prodUrl`
- `deploymentUrl`
- `lanes`
- `userFacingChanges`
- `internalChanges`
- `migrations`
- `featureFlags`
- `verification`
- `artifacts`
- `knownGaps`
- `author`
- `source`
- `diffRange`
- `changedAreas`

## Rules

- Every production deploy needs a release ledger entry.
- The ledger is detailed internal truth; the changelog is the short user-facing summary.
- Do not store secrets in the release draft, release notes, changelog, or ledger.
- Do not treat chat summaries as canonical release memory.

## Notes

- `docs/CHANGELOG.md` remains legacy repo history. The canonical production rollup for this workflow is the root `CHANGELOG.md`.
- The release generator does not deploy anything and does not require Vercel API access.
