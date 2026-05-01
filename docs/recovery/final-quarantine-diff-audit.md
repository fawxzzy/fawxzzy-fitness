# Final Quarantine Diff Audit

Date: 2026-05-01

This audit compares canonical recovery branch content against the quarantine filesystem source with CRLF differences ignored.

## Counts by target/normalized status
- `package.json / material_different`: `1`
- `scripts / material_different`: `1`
- `tests / material_different`: `1`
- `docs/LOCAL-PROD-DATA-SYNC.md / material_different`: `1`
- `docs/PLAYBOOK_NOTES.md / only_canonical`: `1`
- `middleware.ts / only_canonical`: `1`
- `next.config.mjs / only_canonical`: `1`

## Remaining material or structural differences
- `package.json` / `material_different` / `.`
- `next.config.mjs` / `only_canonical` / `.`
- `middleware.ts` / `only_canonical` / `.`
- `docs/PLAYBOOK_NOTES.md` / `only_canonical` / `.`
- `scripts` / `material_different` / `dev.mjs`
- `tests` / `material_different` / `design-system-contract.test.mjs`
- `docs/LOCAL-PROD-DATA-SYNC.md` / `material_different` / `.`
