# Playbook Learning Workflow

This workflow provides a one-command promotion path from local notes into the Playbook repository and lightweight automation to keep learning capture consistent.

## Playbook Sync

### Submodule setup (recommended for deterministic pointer updates)

```bash
git submodule add <Playbook repo url> Playbook
git submodule update --init --recursive
```

### Sibling repo setup

Clone Playbook next to `FawxzzyFitness` (or at `./Playbook`):

```bash
git clone https://github.com/ZachariahRedfield/Playbook.git ../Playbook
```

Optionally set an explicit external path:

```bash
export PLAYBOOK_REPO_PATH=/absolute/or/relative/path/to/Playbook
```

### Sync and update commands

```bash
npm run playbook:sync
npm run playbook:update
npm run playbook:sync-and-update
```

What each command changes:
- `playbook:sync`: pulls the latest Playbook content into this repo integration mode (submodule pointer update, in-tree sibling fast-forward, or external repo fast-forward) and prints the synced commit SHA.
- `playbook:update`: promotes local `Proposed` notes into Playbook destination docs and marks note status as `Promoted`.
- `playbook:sync-and-update`: runs sync first, then performs note promotion.

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
npm run playbook:threshold
```

`playbook:threshold` warns at 10 Proposed notes and fails at 20.

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
