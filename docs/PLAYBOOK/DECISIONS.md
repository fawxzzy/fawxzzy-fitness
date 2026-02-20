# Playbook Decisions

Concrete decisions already visible in this repository.

## Stack: Next.js App Router + TypeScript + Tailwind + Supabase
- What: App uses Next.js 14 App Router with TypeScript strict mode, Tailwind CSS, and Supabase JS.
- Why: Keeps a small full-stack surface with server actions and a managed Postgres/auth backend.
- Alternatives considered: Not explicitly documented.
- Evidence: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app`, `src/lib/supabase/*`.

## Auth/session model: cookie-based Supabase tokens + middleware gating
- What: Access/refresh tokens are stored in cookies and middleware redirects unauthenticated users.
- Why: Enables server-side user resolution and route protection.
- Alternatives considered: Not explicitly documented.
- Evidence: `src/app/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `middleware.ts`, `src/lib/supabase/server.ts`.

## Data ownership model: user-scoped rows with RLS enforced in DB
- What: Core tables include `user_id` and RLS policies for select/insert/update/delete own rows.
- Why: Prevent cross-user data leakage and keep access control in Postgres.
- Alternatives considered: Not explicitly documented.
- Evidence: `supabase/migrations/001_init.sql`, `supabase/migrations/002_routines.sql`, `supabase/migrations/008_exercises_table_and_rls.sql`, `docs/AGENT.md`.

## Routine architecture: templates with day-indexed cycle scheduling
- What: Routine templates (`routines`, `routine_days`, `routine_day_exercises`) are resolved to “today” via timezone-aware day index math.
- Why: Deterministic day selection across locales and repeatable programs.
- Alternatives considered: Not explicitly documented.
- Evidence: `supabase/migrations/002_routines.sql`, `src/lib/routines.ts`, `src/app/today/page.tsx`.

## Session architecture: runtime snapshot + exercise/sets children
- What: A session row is created at start and linked to `session_exercises` and `sets`; historical context is stored on session.
- Why: Preserve workout history even if routine templates change later.
- Alternatives considered: Not explicitly documented.
- Evidence: `supabase/migrations/001_init.sql`, `supabase/migrations/003_sets_reps_history.sql`, `src/app/today/page.tsx`, `docs/CHANGELOG.md`.

## Exercise catalog strategy: global + per-user custom catalog merged at read time
- What: Global exercises (`user_id null`, `is_global true`) are cached; custom exercises are user-scoped and merged/deduped.
- Why: Fast common catalog with personal extension.
- Alternatives considered: Baseline hardcoded fallback retained for compatibility.
- Evidence: `supabase/migrations/008_exercises_table_and_rls.sql`, `supabase/migrations/009_seed_global_exercises.sql`, `src/lib/exercises.ts`, `src/lib/exercise-options.ts`.

## Deployment/runtime mode: dynamic app, no static export
- What: App intentionally avoids static export and keeps dynamic behavior where auth/session state is needed.
- Why: Request-time auth and cookie-backed session resolution require runtime execution.
- Alternatives considered: Static export is explicitly disallowed by project rules.
- Evidence: `CODEX.md`, `docs/AGENT.md`, `next.config.mjs`, `src/app/auth/confirm/route.ts`.

## Inferred: primary deployment target includes Vercel
- What: Environment guidance references Vercel env vars as the deployment path.
- Why: Env error text directs setup in Vercel.
- Alternatives considered: Not explicitly documented.
- Evidence: `src/lib/env.ts`.

## TODO: Decide and document CI pipeline contract
- Rationale: Repo has lint/build scripts but no committed CI workflow file under `.github/workflows`.
- Evidence: `package.json`, repository tree.

## TODO: Decide and document migration rollout policy
- Rationale: Code includes transitional fallback behavior (e.g., exercises table fallback), but no explicit migration execution policy doc exists.
- Evidence: `src/lib/exercises.ts`, `docs/CHANGELOG.md`, `supabase/migrations/*`.
