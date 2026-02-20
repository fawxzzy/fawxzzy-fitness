# Codex Prompt: Schema Change

Implement a schema change for this repo safely.

Requirements:
- Follow `CODEX.md` and `docs/AGENT.md`.
- Add migration(s) under `supabase/migrations/` with incremental naming.
- Keep/extend RLS and ownership (`user_id`) guarantees.
- Update affected server actions/lib queries and `src/types/db.ts` as needed.
- Consider staged rollout safety and fallback behavior.
- Update `docs/CHANGELOG.md` with WHAT + WHY.
- Run `npm run lint` and `npm run build`.
- Summarize migration impact and rollout considerations.
