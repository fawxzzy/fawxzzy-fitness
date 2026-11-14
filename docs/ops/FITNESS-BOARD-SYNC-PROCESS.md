# Fitness board sync process (events, one command, milestone cadence)

Status: process contract, ported from the Mazer board event pipeline (stage 3 of the board-process plan). Owner request: update the project boards less often and spend far fewer tokens doing it. This replaces "an agent hand-edits the registry after every merge" with "append one line per fact, fold them in one deterministic command at a milestone".

Prerequisite already merged: card prose lives in `config/fitness-owner-work-registry.json` as `card` objects (plus `acceptedPublicCardIds` and `statusMapping`), and `scripts/export-project-board-owner.mjs` builds the owner export from it. The fold writes into that registry and regenerates the export with that exporter. It does not change exporter output: with zero pending events `plan` is a no-op and the export is byte-identical.

## Three separated jobs

| Job | Who | Cost | When |
| --- | --- | --- | --- |
| 1. Record an event | any worker or the coordinator | one shell command, no pull request, no CI | when a fact becomes true (merge, deploy, check, decision, new card) |
| 2. Fold events | `npm run board:apply` (no LLM) | one command plus one pull request | at a milestone (below), never per pull request |
| 3. Publish | FawxzzyWeb re-pin (`board-sync.mjs web`), unaliased build, owner moves aliases | one Web pull request, one build | right after job 2, only when the owner-facing site should show the new board |

The owner-facing board is allowed to lag. The lag is stated, not hidden (see "Staleness marker"). There is no GitHub workflow for the fold in Fitness: it is run by hand or by the `board-batch` coordinator.

## Event format

One JSON object per line, appended to the `board-events` branch (file `events.jsonl`):

```
npm run board:event -- --card FF-RET-006 --status review \
  --text "Retention cards render on the Today screen. Not checked on a phone." \
  --pr 244:1dc4e9ca --headless --device false
```

Flags: `--card` (required, `FF-AREA-NNN`), `--text` (required, one plain line), `--status`, `--title`, `--description` (corrective), `--pr <number>[:<mergedSha>]` (repeat; `--webpr` for FawxzzyWeb), `--deployed <build>`, `--headless`, `--device true|false|none` (`none` = no device surface), `--checked-on "<device, build>"` (required with `--device true`), `--ts`, `--by`, or `--json '<whole event>'` for new cards and `reopen`. `ts` defaults to now (UTC). The id is the first 12 hex characters of the sha256 of the canonical event, so the same event is never applied twice and an edited line is detected.

| Field | Meaning |
| --- | --- |
| `v` | always 1 |
| `ts` | ISO UTC time the fact became true; events fold in `ts` order |
| `card` | stable `FF-AREA-NNN` id (regex `^FF-[A-Z]+-[0-9]{3}$`) |
| `status` | optional: `planning`, `in_progress`, `review`, `completed` |
| `text` | one plain line for the card; no URLs, file paths or emails; never starts with the words that begin a generated line |
| `evidence` | optional `{ prs: [{repo, number, mergedSha?}], deployedBuild?, headless?, deviceChecked? (true/false/null), checkedOn? }`; repos `fawxzzy/fawxzzy-fitness`, `fawxzzy/FawxzzyWeb` |
| `title` | optional corrective title (existing card) |
| `description` | corrective, existing card only: replaces the whole description (earlier generated lines stay in the archive), then this event's own generated line is appended |
| `acceptanceCriteria` | corrective, existing card only: 3 or more entries |
| `new` | creates a card: `{ title, description, priority (P0-P3), dependencies, acceptanceCriteria (3 or more), visibility (public/private/unknown, required) }` |
| `reopen` | `true` to move a fixed card back |
| `by` | free label, not part of the id |

If the push fails (offline) the event is saved in the git directory of the clone and `node scripts/board/board-sync.mjs flush` (or the next `event`) sends it.

## Status map (event status to registry status)

| Event status | Registry status written |
| --- | --- |
| `planning` | `planning` |
| `in_progress` | `in_progress` |
| `review` | `review` |
| `completed` | `fixed` |

There is no `blocked` and no `deferred` in Fitness. When the fold READS the registry (for display and the reopen rule) `fixed` reads as `completed`, and `confirmed` and `fawxzzy_review` read as `review`; those two statuses are never written by an event.

## Status versus evidence (enforced by the fold)

- `completed` requires a merged PR (`mergedSha`) AND `deployedBuild`. Work with no runtime surface (tooling, docs, tests) sets `--device none` and then needs only the merged PR. Evidence from earlier archived events for the same card counts.
- Merged but not deployed, or an open PR: use `review`. The generated sentence says "PR #N open" or "Merged, not deployed".
- Device state is explicit: `--headless --device false` adds "Checked only in headless Chromium, not on a real phone."; `--device true` needs `--checked-on`.
- A fixed card does not move back without `reopen`. A new card cannot be created completed. Unknown cards are refused unless the event carries a `new` block. Dependencies must exist.
- Any rejected event stops the whole fold and nothing is written. The owner export is built in memory first, so an exporter rejection also writes nothing.

## Allowlist upkeep (`acceptedPublicCardIds`)

The exporter publishes a `fixed` card only when it is in `acceptedPublicCardIds` AND has `visibility: "public"`. The fold keeps that list consistent:

- A card that reaches `completed` with `visibility: "public"` is appended to `acceptedPublicCardIds` (no duplicates) in the same fold.
- A card with `visibility: "private"` or no explicit visibility is NOT added; the plan prints a warning and the card stays off the public board.
- `check` fails if a completed public card is missing from the list, if the list names a card that does not exist, or if it has duplicates.

## Cards without a `card` object

Of the 56 registry work items, 31 have no `card` object: their prose is generated by the roadmap and session scripts. For those the fold changes only the status and `updatedAt` and prints a warning ("only the status changes"); an event that tries to set title, description or criteria for them is refused. Moving that prose into the registry is a separate owner-visible change and is not part of this stage.

## What the fold writes

`npm run board:plan` prints the diff (cards moved, new cards, allowlist changes, export cards added or removed) and writes nothing. `npm run board:apply` writes, in one step:

1. `config/fitness-owner-work-registry.json`: status, `updatedAt`, a generated `Board update <date>: <text> <evidence sentence>` line appended to the card description (only the newest three generated lines stay; every event stays in the archive), new cards, `acceptedPublicCardIds`, `provenance.boardSync`, registry `updatedAt`. The registry is hand-formatted JSON, so the fold patches only the changed blocks with a style-preserving text patcher (`scripts/board/registry-text.mjs`, verified by a JSON-equality guard) and keeps the file's line endings. It never re-serializes the file.
2. `config/fitness-board-events.jsonl`: the append-only archive of applied events (audit trail and idempotency key; a replay is a no-op).
3. `exports/fitness.project-board.owner-export.v1.json`, regenerated by the existing exporter (`scripts/export-project-board-owner.mjs`).

`apply` then runs `npm run project-board:owner-export:check` on the written result. If it fails, every file is restored, the failing output is printed and the exit code is 2. Last it runs `tests/project-board-owner-export.test.mjs`: that test pins card counts and lifecycles, so a real fold can legitimately require a pin update. In that case the files are KEPT, the exit code is 4 and the message says to update the pinned expectations in `tests/project-board-owner-export.test.mjs` in the SAME pull request. The owner export check is the hard gate; the pin test is a review gate.

## Public-text screens

Card text is published on the owner board, so every string an event can set passes the nine public-text screens in `scripts/board/public-text-screens.mjs` (URL, drive or backslash path, relative or home path, file name, long token-like run, secret or credential word, security finding word, money word, personal data word). `event` refuses a failing string before anything is written; `plan` and `apply` screen the resulting title and description again; `check` screens the text of every exported card. Reword instead of quoting the name.

## Trigger policy (when to sync)

1. the end of a batch (after the batch's merges and the one production deploy),
2. immediately before the owner asks for a report or a Needs-you list,
3. when `npm run board:status` says SYNC DUE: 12 or more pending events, or the oldest is 7 or more days old (`--max-events`, `--max-days` override),
4. never because a single pull request merged.

`node scripts/board/board-sync.mjs status --due` exits 0 when due and 3 when not. Before choosing next work, read the board and the pending events.

## Staleness marker

`status` prints: `Board as of <registry date> (last sync <date>, <N> events applied in total), <P> pending events, oldest <d> d. Not due.` Anything that quotes the board to the owner starts with that line.

## Pull request flow

1. `git fetch origin`; worktree off `origin/main`; `npm run board:plan`, read the diff.
2. `npm run board:apply`. Exit 4 means update the pinned owner-export test in the same pull request.
3. Commit the registry, the archive and the export in one pull request; the normal Fitness checks run (`npm run board:check` is part of the CI contract step).
4. Merge on a clean state with all checks passed on the exact head.
5. In a FawxzzyWeb worktree off `origin/main`: `node <fitness>/scripts/board/board-sync.mjs web --web . --write`, then the Web commands it prints, commit, pull request, merge when `verify` passes.
6. Unaliased production build and readback; the owner moves the aliases.

Production builds, alias moves, database, env values and DNS stay outside all of this.

## Commands

| Command | What |
| --- | --- |
| `npm run board:event -- <flags>` | record one event (board-events branch) |
| `npm run board:status` | pending count, due or not |
| `npm run board:plan` | dry run of the fold |
| `npm run board:apply` | fold, regenerate the export, run the checks |
| `npm run board:check` | integrity (ids, archive, allowlist, screens, counts) plus the owner export check |
| `node scripts/board/board-sync.mjs flush` | send locally saved events |
| `node scripts/board/board-sync.mjs web --web <dir> [--write]` | FawxzzyWeb re-pin |

## Replacing a pending event that a screen rejects

Recorded events are never edited in place (the id is a hash of the content), and a rejected event stops the whole fold, so replace it on the `board-events` branch before `apply`: fetch `origin/board-events`, rewrite only the offending string on that line (same `ts`, no `id`), push a normal fast-forward commit built with `git hash-object`, `git mktree`, `git commit-tree`, then `plan` must print no problems. After a card is folded and published the repair is a new event with `description` instead.

## Rollback

- Before apply: `plan` writes nothing. A wrong event is corrected by a new event, or by `git checkout` of the three files before committing.
- After a merged sync: revert the sync pull request; the archive reverts with it, so the same events are pending again.
- After a Web re-pin: revert the Web pull request and rebuild; production keeps serving the previous build until the owner moves aliases.
- Discard queued events: `git push origin :board-events`.
- Back out the whole process: delete `scripts/board`, `tests/board-sync.test.mjs`, the archive, the npm scripts, the two CI lines and this document; the registry and export stay valid and can be edited as before.

## Limits and unverified claims

- The `board-events` branch has not run against GitHub yet; the event store is tested against local bare repositories (append, two clones alternating, offline fallback, flush) and the fold against scratch copies of the real registry.
- The first real fold may fail the pinned owner-export test (exit 4); that is expected and handled in the same pull request.
- The Web re-pin only copies the export; FawxzzyWeb regenerates its snapshot from it.
