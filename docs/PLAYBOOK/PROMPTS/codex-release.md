# Codex Prompt: Release Prep

Prepare this repo for release.

Requirements:
- Follow `CODEX.md` and `docs/AGENT.md`.
- Use `docs/PLAYBOOK/CHECKLISTS/release-checklist.md`.
- Verify no static export config and no server/client boundary regressions.
- Validate required env var assumptions.
- Update `docs/CHANGELOG.md` with release-ready WHAT + WHY notes.
- Run `npm run lint` and `npm run build`.
- Return a release-readiness summary with any blockers.
