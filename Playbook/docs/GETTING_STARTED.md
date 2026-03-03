# Getting Started

Use this guide to adopt Playbook in a consuming repository quickly and safely.

## What Playbook is

- A versioned governance system for engineering execution across repositories.
- A layered doctrine set (principles, patterns, guardrails, workflows, reference).
- A reusable source of truth consumed via a pinned version and sync cadence.
- A way to reduce governance drift while keeping local repository contracts explicit.

## Who it is for

- Solo developers who want consistent execution standards without heavy process.
- Small teams that need lightweight, repeatable governance across features.
- Multi-repo builders who need shared doctrine with project-specific routing overlays.

## 15–30 minute quickstart: adopt Playbook in a repo

1. **Choose Governance Scope (Normative vs Reference)**
   - Start with [Project Governance Contract](./PROJECT_GOVERNANCE.md).
   - Decide whether Playbook is binding (**Normative**) or advisory (**Reference**) for your repo.

2. **Create required local docs**
   - Copy templates from [`docs/TEMPLATES/consumer-docs/`](./TEMPLATES/consumer-docs/).
   - Fill in local constraints and TODO markers in:
     - `PROJECT_GOVERNANCE.md`
     - `ARCHITECTURE.md`
     - `CHANGELOG.md`
     - `PLAYBOOK_NOTES.md`
     - `PLAYBOOK_CHECKLIST.md`

3. **Pin Playbook version + decide sync cadence**
   - Record a specific Playbook pin (`vX.Y.Z`) in your local governance doc.
   - Set sync cadence (for example: monthly or release-aligned).

4. **Configure consumption method**
   - Follow [Cross-Repo Consumption](./CONSUMPTION.md).
   - Prefer subtree-based consumption for in-repo visibility and controlled updates.

5. **Run work through route-aware workflow**
   - Use the [AI Task Prompt Template](./WORKFLOWS/ai-task-prompt-template.md).
   - Route each task through the [Project Router](./PROJECTS/index.md) and selected overlay.

6. **Capture local learnings and upstream periodically**
   - Record doctrine candidates in local `docs/PLAYBOOK_NOTES.md`.
   - Periodically run the [Upstreaming Playbook Notes workflow](./WORKFLOWS/upstreaming-playbook-notes.md).

## Non-goals

- Playbook is **not** a full SDLC replacement.
- Playbook is **not** a code generator.
- Playbook is **not** a framework for business logic.
