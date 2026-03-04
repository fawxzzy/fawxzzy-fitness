# Contracts

Contracts are machine-checkable governance invariants promoted from doctrine.

- [SERVER_CLIENT_BOUNDARY](./SERVER_CLIENT_BOUNDARY.md)
- [SINGLE_SCROLL_OWNER](./SINGLE_SCROLL_OWNER.md)
- [BOTTOM_ACTIONS_OWNERSHIP](./BOTTOM_ACTIONS_OWNERSHIP.md)
- [SAFE_AREA_OWNERSHIP](./SAFE_AREA_OWNERSHIP.md)

## Audit Rules precedence (v1)

1. If a contract doc contains a valid `## Audit Rules (v1)` section, generated checks are authoritative for that contract.
2. If `Audit Rules (v1)` is absent, Playbook falls back to the hand-written contract check implementation.
3. Contract document presence checks still run for all contracts.
