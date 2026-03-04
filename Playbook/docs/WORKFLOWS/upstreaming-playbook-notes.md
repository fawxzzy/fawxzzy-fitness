# Upstreaming Playbook Notes

Use this workflow to periodically promote reusable doctrine from app-local `docs/PLAYBOOK_NOTES.md` into canonical Playbook docs.

## Goal

Make upstreaming mechanical, auditable, and repeatable across consuming repositories.

## Ritual

1. **Capture locally during implementation**
   - In the application repository, maintain `docs/PLAYBOOK_NOTES.md` using the structured notes template.

2. **Select candidates on an upstream pass**
   - Review notes and promote only reusable doctrine.
   - Classify each selected note as one of:
     - Principle
     - Pattern
     - Guardrail
     - Workflow

3. **Promote into canonical Playbook docs**
   - Add or update the relevant canonical doc in this repository.
   - Cross-link related guardrails/patterns/workflows where applicable.

4. **Update Playbook changelog (WHAT + WHY)**
   - Record the doctrine update in `docs/CHANGELOG.md`.

5. **Bump governance version**
   - Update `docs/VERSIONING.md` according to version-bump rules.

6. **Mark source note as upstreamed**
   - In the application repo note entry, mark status as Upstreamed.
   - Include a Playbook reference link or version note.
   - Keep inbox clean by closing or archiving promoted entries.

7. **Sync downstream via subtree flow**
   - Propagate updated Playbook into consumers via the subtree workflow in `docs/CONSUMPTION.md`.

## Minimal example

- Example source note: `FawxzzyFitness/docs/PLAYBOOK_NOTES.md`.
- Example promotion: classify a reusable UI finding as a Pattern, update Playbook canonical pattern doc, then mark the original app-local note as Upstreamed with the Playbook version/reference.


<!-- PLAYBOOK_NOTE_ID:2026-03-04-use-two-layer-playbook-learning-automation-nudge-enforce -->
### Use two-layer playbook learning automation (nudge + enforce) (from FawxzzyFitness notes, 2026-03-04)
Type: Workflow
Summary: Pair local diff-based note suggestions with CI enforcement so learning-zone code changes consistently produce `PLAYBOOK_NOTES` updates before merge.
Rationale: A suggestion-only workflow is easy to ignore, while enforcement-only creates friction; combining both improves adoption and consistency.
Evidence (FawxzzyFitness):
- scripts/playbook/suggest-notes-from-diff.mjs
- scripts/playbook/check-notes-updated.mjs
- .github/workflows/ci.yml

<!-- PLAYBOOK_NOTE_ID:2026-03-04-keep-governance-telemetry-ci-outputs-artifact-only-to-avoid-commit-loops -->
### Keep governance telemetry CI outputs artifact-only to avoid commit loops (from FawxzzyFitness notes, 2026-03-04)
Type: Guardrail
Summary: CI-generated governance telemetry files (status/trend snapshots) should be uploaded as workflow artifacts and never auto-committed from CI jobs.
Rationale: Artifact-only telemetry preserves historical visibility without creating bot commit churn or recursive workflow triggers.
Evidence (FawxzzyFitness):
- .github/workflows/playbook-learning.yml
- scripts/playbook/write-status-files.mjs
- scripts/playbook/write-trend-files.mjs
