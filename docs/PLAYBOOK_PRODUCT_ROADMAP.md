# Playbook Product Roadmap

## External Pilot Integration — Fawxzzy Fitness

Milestone intent: validate Playbook against a real external repository using the canonical operator command surface.

Scope validated in this milestone:
- External repo bootstrap via `pnpm playbook init` with deterministic runtime creation under `.playbook/runtime.json`.
- Deterministic index and graph generation via `pnpm playbook index` into `.playbook/repo-index.json` and `.playbook/repo-graph.json`.
- External-safe verify fallback via `pnpm playbook verify`, preserving deterministic warnings/findings rather than hard bootstrap failure when Playbook-native governance/docs structure is absent.
- External pilot readiness on canonical flow: `pnpm playbook init`, `pnpm playbook index`, `pnpm playbook verify`, `pnpm playbook plan`, `pnpm playbook apply`.

Pattern — External Runtime Validation:
A repository intelligence system must prove it can operate against an independent real-world repo with no self-referential assumptions.

Failure Mode — Command-Surface Drift:
When planning implementation, always use the canonical operator-facing command surface rather than an internal executable path unless explicitly debugging internals.
