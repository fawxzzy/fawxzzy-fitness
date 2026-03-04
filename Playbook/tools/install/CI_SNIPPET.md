# Playbook CI snippet (GitHub Actions)

Use this in consuming repositories to publish Playbook status as a PR check summary.

```yaml
name: playbook-governance
on:
  pull_request:

jobs:
  playbook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run playbook
      - name: Publish Playbook PR check summary
        run: npm run playbook:status:ci
      - name: Upload Playbook status artifacts
        uses: actions/upload-artifact@v4
        with:
          name: playbook-status
          path: |
            docs/playbook-status.json
            docs/playbook-trend.json
```

Summary source of truth:
- `docs/playbook-status.json` (CI must not recompute counts independently)

Expected summary output:
- Draft / Proposed / Promoted counts
- Contracts PASS/WARN/FAIL
- Suggested next command
