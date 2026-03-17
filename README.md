# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

## Playbook runtime bridge (temporary compatibility only)

This repository currently includes a **temporary** bridge at `scripts/playbook-runtime.mjs`.
The bridge is only a thin adapter that forwards commands to the shared Playbook runtime and must not become a parallel product surface.

Canonical long-term model:
- shared Playbook core runtime
- repo-local state in `.playbook/`
- minimal/no repo wrapper once direct parity is proven

Preferred command surface (explicit `playbook:*` names):

```bash
npm run playbook:ai-context
npm run playbook:ai-contract
npm run playbook:index
npm run playbook:verify
npm run playbook:plan
npm run playbook:pilot
```

Temporary compatibility aliases remain available and forward to the `playbook:*` scripts:
- `npm run ai-context`
- `npm run ai-contract`
- `npm run index`
- `npm run verify`
- `npm run plan`
- `npm run pilot`

Migration note:
- Legacy learning/sync/update command families were removed.
- Legacy vendored subtree workflow guidance no longer applies in this repository.
- Remaining migration-era surfaces are inventoried in `docs/PLAYBOOK_MIGRATION_INVENTORY.md`.

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
