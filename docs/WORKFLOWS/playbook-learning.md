# Playbook Learning Workflow

This workflow provides a one-command promotion path from local notes into the Playbook repository and lightweight automation to keep learning capture consistent.

## Clone Playbook next to this repo

From the parent folder of `FawxzzyFitness`:

```bash
git clone https://github.com/ZachariahRedfield/Playbook.git ../Playbook
```

Optional: set an explicit path if your clone lives elsewhere.

```bash
export PLAYBOOK_REPO_PATH=/absolute/or/relative/path/to/Playbook
```

## Promote notes into Playbook

Run:

```bash
npm run playbook:update
```

What the command does:
- Reads `docs/PLAYBOOK_NOTES.md`.
- Finds entries where `Status` is exactly `Proposed`.
- Writes each proposed note into a Playbook destination file with a stable marker (`<!-- PLAYBOOK_NOTE_ID:... -->`) so reruns are idempotent.
- Updates each promoted note in `docs/PLAYBOOK_NOTES.md` from `Proposed` to `Promoted`.
- Sets `Upstream: Local (pending PR)` on promoted notes.

Optional local commits in both repos:

```bash
npm run playbook:update:commit
```

This creates local commits only when both repositories are clean and never pushes.

## Autonomous learning helpers

### Nudge from diff

```bash
npm run playbook:suggest
```

This checks recent changes (`HEAD~1` by default) and prints a suggested `docs/PLAYBOOK_NOTES.md` entry when high-learning zones were touched.

### Enforce in CI

```bash
npm run playbook:check
```

This fails when learning-zone files changed but `docs/PLAYBOOK_NOTES.md` was not updated.

## Conflict and re-run behavior

Promotion is marker-based and idempotent. If a destination section already exists, the marker block is replaced rather than duplicated. If conflicts occur:
- resolve file conflicts,
- rerun `npm run playbook:update`,
- verify the generated section blocks and note statuses.

## Status lifecycle

Use these local note statuses to track doctrine maturity:
- `Proposed`: local learning captured.
- `Promoted`: written into Playbook repo files (pending acceptance).
- `Upstreamed`: accepted as official doctrine upstream.
