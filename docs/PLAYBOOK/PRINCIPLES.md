# Playbook Principles

These principles are extracted from current repository behavior and instructions.

## 1) Prioritize speed and simplicity over polish
- Principle: Ship the fastest clear solution that preserves core workout flow.
- Evidence: `docs/PROJECT.md`, `docs/AGENT.md`, `CODEX.md`.
- How to apply:
  - Prefer small focused files over broad abstractions.
  - Reject scope creep unrelated to lift → log → leave.

## 2) Keep progression logic deterministic and explainable
- Principle: Behavior should be rule-based and auditable, not opaque.
- Evidence: `docs/ENGINE.md`, `docs/PROJECT.md`, `docs/AGENT.md`.
- How to apply:
  - Encode deterministic rules in reusable lib functions.
  - Avoid hidden “AI” decision layers in user-facing progression.

## 3) Enforce strict server/client boundaries
- Principle: Server-only utilities stay server-only; client code uses client-safe modules.
- Evidence: `docs/AGENT.md`, `src/lib/auth.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`.
- How to apply:
  - Use `import "server-only"` for server helpers and actions.
  - Keep browser Supabase client isolated to client modules.

## 4) Treat RLS + user ownership as non-negotiable
- Principle: Every user-owned row includes `user_id` and is protected by RLS.
- Evidence: `docs/AGENT.md`, `supabase/migrations/001_init.sql`, `supabase/migrations/002_routines.sql`, `supabase/migrations/008_exercises_table_and_rls.sql`.
- How to apply:
  - Include `user_id` in inserts and ownership filters in queries.
  - Add/maintain select/insert/update/delete own policies.

## 5) Preserve dynamic runtime behavior for auth/session correctness
- Principle: Auth and session-sensitive routes stay dynamic.
- Evidence: `docs/AGENT.md`, `src/app/today/page.tsx`, `src/app/auth/confirm/route.ts`, `next.config.mjs`.
- How to apply:
  - Keep auth/session routes `force-dynamic` when request state is required.
  - Do not add static-export config.

## 6) Favor defensive fallback paths for gradual rollout safety
- Principle: Prefer resilient runtime fallbacks over hard crashes during staged schema rollouts.
- Evidence: `src/lib/exercises.ts`, `docs/CHANGELOG.md`, `supabase/migrations/008_exercises_table_and_rls.sql`.
- How to apply:
  - Handle known transitional DB errors explicitly (e.g., `42P01`).
  - Provide safe fallback data where product flow would otherwise break.

## 7) Keep product language consistent with mental model
- Principle: UI wording should match the current domain model (“routine”, “session”, “today”).
- Evidence: `docs/CHANGELOG.md`, `src/app/today/page.tsx`, `src/app/routines/page.tsx`.
- How to apply:
  - Reuse established labels and avoid introducing synonyms casually.
  - Update copy consistently across screens, not one-off.

## 8) Make profile + timezone required context for planning logic
- Principle: Routine day resolution depends on timezone-aware date math and must be deterministic.
- Evidence: `src/lib/profile.ts`, `src/lib/routines.ts`, `src/app/today/page.tsx`.
- How to apply:
  - Ensure profile exists before routine/session operations.
  - Use shared timezone day window helpers instead of ad hoc date handling.
