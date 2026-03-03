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

