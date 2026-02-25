# Project Governance

This repository is governed by the Product Engineering Playbook.

Source of truth:
https://github.com/ZachariahRedfield/Playbook

## Updating Playbook (Subtree Model)

When the central Playbook repository changes and you want to bring updates into this repository:

```bash
git subtree pull --prefix=Playbook https://github.com/ZachariahRedfield/Playbook.git main --squash
```

This pulls the latest `main` from the Playbook repository, squashes upstream changes into a single commit, and updates only the local `Playbook/` subtree to keep history compact.

If your git alias is already configured, use:

```bash
git sync-playbook
```

Mental model: treat subtree-managed Playbook content as vendored doctrine with controlled, intentional updates. Nothing auto-updates unless you run the sync command.

### Clean workflow

1. Commit and push changes in the central Playbook repository.
2. In this repository, run `git sync-playbook`.
3. Commit subtree update changes if needed (subtree may auto-commit in some cases).
4. Push and merge.

## Rules for Codex / Agents

1. Follow the central Playbook principles and patterns.
2. Follow local docs/ARCHITECTURE.md for project-specific structure.
3. Update docs/CHANGELOG.md (WHAT + WHY) for all non-trivial changes.
4. Capture reusable learnings:
   - If a change introduces a reusable pattern, guardrail, failure mode, or decision:
     - Add an entry to docs/PLAYBOOK_NOTES.md (see format below)
     - Include a brief “Playbook Impact” section in your output (optional but preferred)

## Playbook Compliance Workflow (Required Before Changes)

Before implementing repository code or structural changes:

1. Read Playbook/ (vendored subtree) sections relevant to the request.
2. Read docs/PLAYBOOK_CHECKLIST.md.
3. Perform a Playbook Compliance Review:
   - Identify applicable Playbook + checklist rules.
   - Identify request conflicts against those rules.
   - Propose compliant alternatives when needed.
   - Provide a short implementation plan before coding.
4. Do not modify the central Playbook subtree unless explicitly requested.

## Enforcement Guardrails

- `docs/ARCHITECTURE.md` is the local architectural contract; do not introduce undocumented architectural drift.
- Do not create new structural layers without clear justification.
- Preserve strict server/client boundaries, RLS safety, and server-owned data writes.
- Use strict server actions for protected mutations (`requireUser()` + `supabaseServer()`).
- Prefer the smallest clear diff over abstraction-heavy changes.
- Run quality gates after implementation:
  - `npm run lint`
  - `npm run build`

## Documentation Scope in This Repo

Allowed documentation files:
- docs/PROJECT_GOVERNANCE.md
- docs/ARCHITECTURE.md
- docs/CHANGELOG.md
- docs/PLAYBOOK_NOTES.md
- docs/PLAYBOOK_CHECKLIST.md

All reusable patterns, templates, prompts, and checklists live in the central Playbook repository.
