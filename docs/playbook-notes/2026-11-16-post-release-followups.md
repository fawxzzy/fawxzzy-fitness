## 2026-11-16 - Post-release follow-ups: stale test path, header invariants, dev divider

- Type: Maintenance
- WHAT changed: `test:auth-ui-contracts` no longer lists the deleted `tests/account-update-actions.test.mjs`. The truth-pack `header` invariants now describe ScreenHeader (tab/detail, one truncating title, left Back on detail, one trailing action). The dev EditDay fixture divider uses `--border-strong` instead of amber, and `dockRoles.contract.test.ts` now covers that file. PLAYBOOK_NOTES carries a "removed in #279" note.
- WHY it changed: Follow-ups left by #265, #276 and #279.
- Rule: When a test file is deleted, grep package.json, CI and docs for its path in the same PR.
- Failure Mode: A test list that names a missing file fails the whole script run.
- Decision: The SessionPageClient `Plans:` label is already gone (the page uses `Days:` and a test bans `Plans:`), so no change.
- Status: Source only.
