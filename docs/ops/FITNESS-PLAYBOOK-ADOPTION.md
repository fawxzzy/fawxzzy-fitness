# Fitness Playbook Adoption

This repo claims the Playbook owner contract `playbook_convergence_contract` at version `1.0.0` from `repos/fawxzzy-playbook/exports/playbook.contract.example.v1.json`.

It does not copy the Playbook contract locally. Repo-owned evidence for this tranche lives in:

- `exports/repo.playbook.adoption.evidence.schema.v1.json`
- `exports/fitness.playbook.adoption.evidence.v1.json`
- `tests/playbook-adoption-evidence.test.mjs`

## Current Status

- adoption status: `adopted`
- verification state: `targeted`
- continuity status: `structured`
- drift status: `none_detected`

The repo is intentionally conservative about what it claims. This tranche proves the repo can declare its contract version, export repo-local adoption evidence, and validate that evidence against the owner contract ids and local schema. It does not claim to own stack-level approval or execution boundaries that belong elsewhere.

## Implemented Patterns

Implemented in this repo:

- `pattern_ground_work_in_current_awareness`
  Evidence: `README.md`, `docs/PROJECT_GOVERNANCE.md`
- `pattern_explicit_trust_posture`
  Evidence: `exports/fitness.playbook.adoption.evidence.v1.json`, this doc
- `pattern_owner_repo_keeps_owner_truth`
  Evidence: local export points back to the Playbook owner export
- `pattern_convergence_is_measurable`
  Evidence: `tests/playbook-adoption-evidence.test.mjs`
- `pattern_structured_handoff_and_promotion`
  Evidence: this doc, `docs/PLAYBOOK_NOTES.md`, `docs/CHANGELOG.md`

Not applicable in this repo:

- `pattern_proposal_before_execution`

That pattern is scoped by the Playbook contract to `atlas_root`, `lifeline`, and `stack_orchestrator`. Fitness is a `vertical_owner_repo`, so the repo records the non-applicability explicitly instead of omitting it.

## Adoption Checks

Implemented here:

- `adoption_continuity_lane_is_structured`
- `adoption_trust_posture_is_negative_safe`

Not applicable here:

- `adoption_playbook_exports_contract`
- `adoption_atlas_consumes_owner_truth_read_only`
- `adoption_proposal_and_execution_are_separate`

Those remain owned by Playbook, ATLAS root, and Lifeline or `_stack` rather than by this repo.

## Continuity Posture

Fitness follows the ATLAS continuity lane for serious Codex or ChatGPT work:

- raw transcript is `trace_only`
- structured handoff is required
- durable facts promote into repo docs, truth-pack evidence, or stack continuity artifacts

Current handoff contract reference:

- `schemas/atlas.continuity.handoff.v1.json`

Current durable promotion targets for repo-local work:

- `docs/PLAYBOOK_NOTES.md` for repo-specific Playbook notes and promotion candidates
- `docs/CHANGELOG.md` for durable shipped change notes
- `truth-pack/fitness/` for governed ecosystem-facing receipts and state surfaces

## Repo-Local Evidence

Evidence for this slice should stay stable and repo-owned:

- repo identity and role: `exports/fitness.playbook.adoption.evidence.v1.json`
- local Playbook runtime and bootstrap posture: `README.md`, `docs/PROJECT_GOVERNANCE.md`
- targeted validation: `tests/playbook-adoption-evidence.test.mjs`
- stack-facing receipt or action posture: `.lifeline/fitness.lifeline.yml`, `truth-pack/fitness/actions-and-receipts.json`

## Out Of Scope

This tranche does not:

- duplicate the Playbook contract text in Fitness
- claim stack-owned approval or execution controls as repo-local features
- treat transcripts as durable memory
- invent a second root-owned truth store for repo doctrine
