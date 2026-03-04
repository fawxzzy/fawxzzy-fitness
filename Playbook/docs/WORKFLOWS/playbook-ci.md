# Playbook CI Workflow

Use the status artifact (`docs/playbook-status.json`) as the source of truth for CI summaries and PR comments.

## Baseline CI steps

1. Install dependencies.
2. Run the Playbook engine.
3. Render dashboard markdown from the generated status file.

```bash
npm ci
npm run playbook
npm run playbook:status:ci
```

## Required status inputs

Read only these fields from `docs/playbook-status.json`:

- Knowledge counts (`knowledge.draft.count`, `knowledge.proposed.count`, `knowledge.promoted.count`)
- Contracts summary (`contracts.summary`)
- Recommendation (`recommendation.nextCommand`, `recommendation.reason`, `recommendation.suggestedWhen`)

Do not recompute counts independently in CI.

## GitHub Actions example

```yaml
name: playbook-status
on:
  pull_request:
  workflow_dispatch:

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
      - run: npm run playbook:status:ci | tee /tmp/playbook-dashboard.md
      - name: Add dashboard to step summary
        run: cat /tmp/playbook-dashboard.md >> "$GITHUB_STEP_SUMMARY"
```

## Formatter utility

Use `tools/engine/format-dashboard.mjs` (or `tools/engine/pr-summary.mjs`) to transform `docs/playbook-status.json` into compact markdown:

- Knowledge (Draft / Proposed / Promoted)
- Contracts (pass / warn / fail)
- Next command recommendation
