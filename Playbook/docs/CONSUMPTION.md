# Cross-Repo Consumption

## Recommended integration mode
Start with [`docs/PROJECT_GOVERNANCE.md`](./PROJECT_GOVERNANCE.md), then use **git subtree** for downstream repositories to consume this Playbook.

- Subtree keeps governance files in-repo for offline review and CI usage.
- Subtree avoids detached pointer management required by submodules.
- Manual sync is allowed only for short-lived experiments.

## Integration contract
Use [`docs/PROJECT_GOVERNANCE.md`](./PROJECT_GOVERNANCE.md) as the canonical contract template.

1. Vendor Playbook docs into each product repository under `Playbook/`.
2. Declare whether Playbook is **Normative** or **Reference** in the product repo governance scope declaration.
3. Map local required docs (`docs/PROJECT_GOVERNANCE.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`) to Playbook rules.

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
