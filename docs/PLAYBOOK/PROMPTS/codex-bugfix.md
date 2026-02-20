# Codex Prompt: Bugfix

Fix a bug in this repo with minimal, deterministic changes.

Requirements:
- Follow `CODEX.md` and `docs/AGENT.md`.
- Diagnose root cause from existing code paths before patching.
- Prefer small, clear fixes over refactors.
- Preserve Supabase auth/client boundaries and RLS-safe ownership filtering.
- Update `docs/CHANGELOG.md` with WHAT + WHY.
- Run `npm run lint` and `npm run build`.
- Provide a concise summary of cause, fix, and validation commands.
