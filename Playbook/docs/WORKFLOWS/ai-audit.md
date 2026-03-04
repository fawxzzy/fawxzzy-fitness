# AI Audit Workflow

## Required pre-patch status check

Before generating patches, agents MUST read `docs/playbook-status.json`.

1. Run `npm run playbook` if the file is missing or stale.
2. Parse `contracts.summary` and `contracts.byContract`.
3. Parse `recommendation` for next-step flow guidance.
4. Run `npm run playbook:summary` to print the dashboard block derived from the status file.

## Decision rules

- If any contract is `fail`, fix contract violations first before feature/refactor patches.
- If recommendation indicates a promotion flow (`npm run playbook:promote`), propose or execute that lifecycle promotion as part of the task.
- If recommendation indicates contracts work (`npm run playbook:contracts`), complete contract verification before merge-oriented changes.

## Output expectations

Agent status updates and PR summaries should include:

- Draft / Proposed / Promoted counts
- Contracts PASS/WARN/FAIL summary
- Recommended next command and short reason

All values should come from `docs/playbook-status.json` as the source of truth.

## CI usage

- CI should execute `npm run playbook` then `npm run playbook:summary`.
- Avoid duplicate count logic in workflow scripts; consume `docs/playbook-status.json` directly.
