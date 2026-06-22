# Fitness Playbook Adoption

This repo claims the Playbook owner contract `playbook_convergence_contract` at version `1.0.0` from `repos/playbook/exports/playbook.contract.example.v1.json`.

It does not copy the Playbook contract locally. Repo-owned evidence for this tranche lives in:

- `exports/repo.playbook.adoption.evidence.schema.v1.json`
- `exports/fitness.playbook.adoption.evidence.v1.json`
- `tests/playbook-adoption-evidence.test.mjs`

## Current Status

- adoption status: `adopted`
- verification state: `targeted`
- continuity status: `structured`
- drift status: `none_detected`

This tranche proves that Fitness can declare its Playbook contract version, publish one stable repo-local adoption export, and validate that export against the owner contract ids and the repo schema without moving Playbook truth into the app repo.

## Repo-Owned Truth Boundaries

Fitness keeps its owned workflow and runtime truth here:

- `README.md`
- `truth-pack/fitness/README.md`
- `truth-pack/fitness/governance-loop.md`
- `docs/architecture/fitness-integration.md`
- `docs/ops/FITNESS-PLAYBOOK-VERIFICATION.md`

Those surfaces define the governed loop, repo-local boundary posture, and reusable ecosystem contract for the app. ATLAS root consumes the resulting evidence read-only instead of synthesizing a second owner-truth store.

## Implemented Patterns

Implemented in this repo:

- `pattern_ground_work_in_current_awareness`
  Evidence: `README.md`, `truth-pack/fitness/README.md`, `docs/architecture/fitness-integration.md`
- `pattern_explicit_trust_posture`
  Evidence: `truth-pack/fitness/governance-loop.md`, this doc, `exports/fitness.playbook.adoption.evidence.v1.json`
- `pattern_owner_repo_keeps_owner_truth`
  Evidence: `truth-pack/fitness/README.md`, this doc, `exports/fitness.playbook.adoption.evidence.v1.json`
- `pattern_convergence_is_measurable`
  Evidence: `tests/playbook-adoption-evidence.test.mjs`, `package.json`
- `pattern_structured_handoff_and_promotion`
  Evidence: `README.md`, `truth-pack/fitness/governance-loop.md`, this doc

Not applicable in this repo:

- `pattern_proposal_before_execution`

That boundary is currently owned by ATLAS root, Lifeline, and `_stack`. Fitness records the non-applicability explicitly rather than implying the app repo owns those governed proposal lanes.

## Adoption Checks

Implemented here:

- `adoption_continuity_lane_is_structured`
- `adoption_trust_posture_is_negative_safe`

Not applicable here:

- `adoption_playbook_exports_contract`
- `adoption_atlas_consumes_owner_truth_read_only`
- `adoption_proposal_and_execution_are_separate`

Those remain owned by Playbook, ATLAS root, Lifeline, and `_stack` rather than by the Fitness repo.

## Continuity Posture

Fitness follows the ATLAS continuity contract for serious Codex or ChatGPT work:

- raw transcript is `trace_only`
- structured handoff is required
- durable repo facts promote into repo-owned docs, truth-pack surfaces, exports, and receipts rather than staying as transcript residue

Current handoff contract reference:

- `schemas/atlas.continuity.handoff.v1.json`

Current durable promotion targets for repo-local work:

- `truth-pack/fitness/` for governed ecosystem truth
- `docs/architecture/fitness-integration.md` for durable seam and boundary doctrine
- `docs/ops/` for repo-owned operator receipts and verification notes
- `exports/` for machine-readable owner evidence

Transcript residue is never the durable endpoint by itself.

## Trust And Boundary Notes

The repo keeps restricted posture explicit:

- the governed loop remains `signal -> plan -> action -> receipt`
- direct bypass of the Playbook or Lifeline seam is not allowed
- root projection must consume repo evidence read-only
- targeted verification for this tranche does not imply broader product certification

This keeps repo-local truth honest without widening the repo’s authority claim.
