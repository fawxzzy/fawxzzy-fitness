# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

## Playbook operator workflow (canonical)

This repository uses the Playbook runtime bridge via `scripts/playbook-runtime.mjs`.
Use only this command surface for Playbook operations:

```bash
npm run ai-context
npm run ai-contract
npm run index
npm run verify
npm run plan
npm run pilot
```

Migration note:
- Legacy learning/sync/update command families were removed.
- Legacy vendored subtree workflow guidance no longer applies in this repository.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```
