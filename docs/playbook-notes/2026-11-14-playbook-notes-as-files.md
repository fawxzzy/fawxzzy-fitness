## 2026-11-14 - Playbook notes become one file per change

- Type: Process tooling (config + docs)
- WHAT changed: `playbook.config.json` now sets `verify.rules.requireNotesOnChanges` with the Playbook default `whenChanged` globs and `mustTouch` of `docs/PLAYBOOK_NOTES.md` plus `docs/playbook-notes/**`. New notes are one file per change under `docs/playbook-notes/` (see its README). `docs/PLAYBOOK_NOTES.md` stays as history and is marked `merge=union` in `.gitattributes`. Governance and guardrail docs list the new folder.
- WHY it changed: Every code pull request had to append to the single notes file, so parallel pull requests conflicted on it and several post-wiring CI runs went red on this rule.
- Rule: A required per-change record is one new file, never an append to a shared file.
- Evidence: Rule matches globs via `matchesAny` in playbook `packages/engine/src/verify/rules/requireNotesOnChanges.ts` (v0.74.0); a scratch commit with a `src/` change plus only a `docs/playbook-notes/` file passed `npm run verify` (not pushed).
- Status: Source only; docs and config, no runtime or deploy surface.
