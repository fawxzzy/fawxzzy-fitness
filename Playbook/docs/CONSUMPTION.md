# Cross-Repo Consumption

## Recommended integration mode
Start with [`docs/PROJECT_GOVERNANCE.md`](./PROJECT_GOVERNANCE.md), then vendor Playbook into downstream repositories with **git subtree** (preferred) or **git submodule**.

- Subtree keeps governance files in-repo for offline review and CI usage.
- Submodule keeps the Playbook boundary explicit if teams already manage submodule pointers.
- Manual sync is allowed only for short-lived experiments.

## Integration contract
Use [`docs/PROJECT_GOVERNANCE.md`](./PROJECT_GOVERNANCE.md) as the canonical contract template.

1. Vendor Playbook into each product repository under `Playbook/`.
2. Declare whether Playbook is **Normative** or **Reference** in the product repo governance scope declaration.
3. Map local required docs (`docs/PROJECT_GOVERNANCE.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`) to Playbook rules.

## Repeatable adoption path (FawxzzyFitness engine → new repo)

1. Vendor this repo into the target repository.

```bash
# subtree (preferred)
git subtree add --prefix Playbook <playbook-remote> main --squash
# or submodule
git submodule add <playbook-remote> Playbook
```

2. Add repo-local Playbook config at `tools/playbook/config.json`.

```json
{
  "notesPath": "docs/PLAYBOOK_NOTES.md",
  "trendPath": "docs/playbook-trend.json",
  "contracts": { "enabled": true }
}
```

3. Add package scripts.

```json
{
  "scripts": {
    "playbook": "node ./Playbook/tools/engine/cli.mjs run",
    "playbook:status": "node ./Playbook/tools/engine/cli.mjs status",
    "playbook:summary": "node ./Playbook/tools/engine/pr-summary.mjs",
    "playbook:doctor": "node ./Playbook/tools/doctor/cli.mjs",
    "verify": "npm run playbook",
    "verify:strict": "npm run playbook && npm run lint && npm run build"
  }
}
```

4. Install non-blocking pre-commit hook with Playbook installer.

```bash
node ./Playbook/tools/install/cli.mjs
```

5. Add CI step to publish a PR check summary (Draft/Proposed/Promoted, Contracts PASS/WARN/FAIL, suggested next command).
   - See `Playbook/tools/install/CI_SNIPPET.md`.

6. Add `docs/CODEX_GUARDRAILS.md` in the product repo and require AI agents to run `npm run verify` (or `npm run verify:strict`) before finalizing changes.

7. Run `npm run playbook:doctor -- --cwd=.` after install to verify health checks and resolve WARN/FAIL items before enabling CI enforcement.

## Divergence handling
- Local divergence is allowed only for repository-specific architectural contracts.
- Reusable doctrine changes must be proposed back to Playbook first.
- If local urgency requires a temporary fork, record the divergence reason and sunset target in local changelog/decision notes.

## Safe sync workflow
1. Pull upstream Playbook updates into a dedicated branch.
2. Run local governance checks and architecture contract review.
3. Resolve conflicts without silently weakening local invariants.
4. Update local changelog with WHAT + WHY.
5. Merge only after downstream checks pass.


## Migration strategy: FawxzzyFitness-style repo-local scripts → Playbook engine

1. Preserve existing output paths (`docs/playbook-status.json`, `docs/playbook-trend.json`) to avoid CI breakage.
2. Replace repo-local playbook script entries with Playbook tool calls:
   - `node ./Playbook/tools/engine/cli.mjs run`
   - `node ./Playbook/tools/engine/format-dashboard.mjs` for CI status rendering
3. Move repo-specific tuning into `tools/playbook/config.json`:
   - thresholds
   - contracts allowlists/exceptions
   - guardian tuning placeholders
4. Replace custom pre-commit shell hooks with the Node installer hook (`node ./Playbook/tools/install/cli.mjs`) so Windows/macOS/Linux all run the same hook logic.
5. Keep CI status-file-driven:
   - run `npm run playbook`
   - read `docs/playbook-status.json`
   - publish markdown dashboard using the formatter utility
6. After migration, remove superseded repo-local scripts under `scripts/playbook/*` only after one green CI cycle confirms status/trend parity.
