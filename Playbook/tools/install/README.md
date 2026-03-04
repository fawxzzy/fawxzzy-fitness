# Playbook Install Kit

Installs Playbook scripts, repo-local config, a non-blocking pre-commit hook, and CI guidance.

## Run

```bash
node ./tools/install/cli.mjs
```

## What it does

- Adds recommended scripts (`playbook`, `playbook:status`, `playbook:status:ci`, `playbook:summary`, `playbook:promote`, `playbook:contracts`, `playbook:doctor`, `verify`, `verify:strict`).
- Creates `tools/playbook/config.json` for repo-local thresholds/path overrides.
- Configures `.githooks/pre-commit` to run `npm run playbook` and auto-stage `docs/PLAYBOOK_NOTES.md` and `docs/playbook-status.json`.
- Sets `git config core.hooksPath .githooks`.
- Points maintainers to `tools/install/CI_SNIPPET.md`.
- Runs `npm run playbook:doctor -- --cwd=<repo>` at the end for an immediate health check report.

- Seeds config defaults for contracts allowlists/exceptions and optional guardian tuning.
