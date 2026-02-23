# Fawxzzy Fitness — Playbook Export (Evidence-Based)

## 1) Repo Snapshot

### Tech stack (frameworks + key libs)
- Next.js App Router + React + TypeScript.
  - Evidence: `package.json`, `src/app/**`, `tsconfig.json`.
- Tailwind CSS for styling.
  - Evidence: `package.json`, `tailwind.config.ts`, `src/app/globals.css`.
- Supabase JS client for auth + Postgres access.
  - Evidence: `package.json`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`.

### Deployment/hosting assumptions
- Runtime is dynamic (no static-export config is used or allowed).
  - Evidence: `next.config.mjs`, `CODEX.md`, `docs/AGENT.md`, `src/app/auth/confirm/route.ts` (`dynamic = "force-dynamic"`).
- Environment setup text explicitly references Vercel environment variables.
  - Evidence: `src/lib/env.ts`.

### Major folders/modules
- `src/app/`: Route pages, route handlers, and server actions (auth, today, session, routines, history).
  - Evidence: `src/app/**` (e.g., `src/app/today/page.tsx`, `src/app/session/[id]/page.tsx`, `src/app/auth/confirm/route.ts`).
- `src/lib/`: Domain helpers (auth guard, routine/timezone math, profile bootstrap, exercise loading, Supabase client factories).
  - Evidence: `src/lib/auth.ts`, `src/lib/routines.ts`, `src/lib/profile.ts`, `src/lib/exercises.ts`, `src/lib/supabase/*`.
- `src/components/`: Shared UI/navigation/session subcomponents.
  - Evidence: `src/components/AppNav.tsx`, `src/components/SessionTimers.tsx`, `src/components/ui/*`.
- `supabase/migrations/`: Schema + RLS policies + data evolution.
  - Evidence: `supabase/migrations/001_init.sql`, `002_routines.sql`, `008_exercises_table_and_rls.sql` (and subsequent migrations).
- `docs/`: Product rules, engine rules, agent rules, changelog, and existing internal playbook docs.
  - Evidence: `docs/PROJECT.md`, `docs/ENGINE.md`, `docs/AGENT.md`, `docs/CHANGELOG.md`, `docs/PLAYBOOK/*`.

---

## 2) Core Principles (EVIDENCED)

### 1. Build for speed and clarity first.
- Why: Product priority is fast, no-fluff lift/log flow.
- How:
  - Keep scope tight to workout flow.
  - Prefer direct implementations over abstraction-heavy design.
  - Keep files small and readable.
- Evidence: `docs/PROJECT.md`, `docs/AGENT.md`, `CODEX.md`.

### 2. Keep progression deterministic and explainable.
- Why: Product explicitly rejects opaque black-box behavior.
- How:
  - Use rules based on prior performance.
  - Keep progression inputs/outputs explicit.
  - Avoid hidden AI decision layers in user-facing logic.
- Evidence: `docs/ENGINE.md`, `docs/PROJECT.md`, `docs/AGENT.md`.

### 3. Enforce strict server/client boundaries.
- Why: Prevent runtime boundary violations and auth bugs.
- How:
  - Mark server-only modules with `import "server-only"`.
  - Keep browser Supabase client isolated to client-only module.
  - Avoid importing server utilities into client components.
- Evidence: `docs/AGENT.md`, `src/lib/auth.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`.

### 4. Treat user ownership + RLS as mandatory.
- Why: Per-user isolation is enforced at DB level.
- How:
  - Include `user_id` in user-owned rows.
  - Filter queries by `user_id`.
  - Enable RLS and define own-row policies for CRUD.
- Evidence: `docs/AGENT.md`, `supabase/migrations/001_init.sql`, `supabase/migrations/002_routines.sql`, `supabase/migrations/008_exercises_table_and_rls.sql`, `src/app/today/page.tsx`.

### 5. Keep auth/session routes runtime-dynamic.
- Why: Cookie-based auth requires request-time resolution.
- How:
  - Use middleware gating.
  - Use server-side Supabase client with cookie token.
  - Keep auth callbacks dynamic.
- Evidence: `middleware.ts`, `src/lib/supabase/server.ts`, `src/app/auth/confirm/route.ts`, `CODEX.md`, `docs/AGENT.md`.

### 6. Make timezone-aware routine resolution deterministic.
- Why: “Today’s day” must not drift by locale/timezone.
- How:
  - Ensure profile exists and has timezone.
  - Compute routine day index via shared helper.
  - Query completed sessions by timezone day window.
- Evidence: `src/lib/profile.ts`, `src/lib/routines.ts`, `src/app/today/page.tsx`.

### 7. Prefer resilient fallbacks during schema rollout risk.
- Why: Avoid user-facing hard crashes on partially rolled deployments.
- How:
  - Handle known migration-missing conditions.
  - Fall back to baseline exercise options if table unavailable.
- Evidence: `src/lib/exercises.ts`, `docs/CHANGELOG.md`, `supabase/migrations/008_exercises_table_and_rls.sql`.

### 8. Keep copy and domain language consistent (“routine”, “session”, “today”).
- Why: Reduces user mental-model friction.
- How:
  - Reuse existing labels across screens.
  - Avoid introducing alternate naming for same concept.
- Evidence: `docs/CHANGELOG.md`, `src/app/today/page.tsx`, `src/app/routines/page.tsx`, `src/app/history/page.tsx`.

---

## 3) Architectural Patterns (EVIDENCED)

### Pattern A: Supabase Auth + middleware gate + cookie session
- Problem: Protect app routes while supporting server-side user resolution.
- Approach:
  - Middleware redirects unauthenticated users.
  - Login/signup/confirm set auth cookies.
  - Server helpers fetch current user before protected operations.
- When to use: Any authenticated page/action/route.
- When not to use: Public auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/confirm`).
- Evidence: `middleware.ts`, `src/app/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/lib/auth.ts`, `src/lib/supabase/server.ts`.

### Pattern B: Route-local server actions for mutations + revalidation
- Problem: Keep mutation logic close to page workflows with fresh UI.
- Approach:
  - Define `"use server"` actions inside route files (or feature `actions.ts`).
  - Perform Supabase mutation.
  - Revalidate path/tag and redirect or return user message.
- When to use: Routine/session/exercise CRUD tied to one route.
- When not to use: Shared cross-feature logic better placed in `src/lib/*`.
- Evidence: `src/app/today/page.tsx`, `src/app/routines/page.tsx`, `src/app/session/[id]/page.tsx`, `src/app/actions/exercises.ts`.

### Pattern C: Template-to-session snapshot at workout start
- Problem: Preserve history even if routine template changes later.
- Approach:
  - Resolve active routine + current day.
  - Create session row with routine metadata snapshot.
  - Seed session exercises from routine day exercises.
- When to use: Starting a new workout from routine plan.
- When not to use: Editing already completed session history.
- Evidence: `src/app/today/page.tsx`, `src/types/db.ts` (`SessionRow`, `SessionExerciseRow`), `supabase/migrations/001_init.sql`, `supabase/migrations/002_routines.sql`.

### Pattern D: Global + per-user exercise catalog merge
- Problem: Need fast base exercise list plus custom user additions.
- Approach:
  - Load global catalog server-side (cached).
  - Load user-owned custom exercises.
  - Merge + normalize + dedupe.
- When to use: Any exercise picker/listing UX.
- When not to use: Strict admin-only catalog maintenance paths.
- Evidence: `src/lib/exercises.ts`, `src/lib/exercise-options.ts`, `supabase/migrations/008_exercises_table_and_rls.sql`, `supabase/migrations/009_seed_global_exercises.sql`.

### Pattern E: Timezone-safe day-window and day-index helpers
- Problem: Date boundaries differ by timezone and DST.
- Approach:
  - Compute day index from timezone-aware date string.
  - Compute ISO start/end window for the user’s local day.
- When to use: Today/day selection and “completed today” counts.
- When not to use: None in current routine scheduling context.
- Evidence: `src/lib/routines.ts`, `src/app/today/page.tsx`.

---

## 4) Data Modeling & Storage (EVIDENCED)

### Current schema approach
- Relational Postgres schema evolved via ordered SQL migrations.
  - Evidence: `supabase/migrations/*.sql`.
- Core entities: `profiles`, `routines`, `routine_days`, `routine_day_exercises`, `sessions`, `session_exercises`, `sets`, `exercises`.
  - Evidence: `supabase/migrations/001_init.sql`, `002_routines.sql`, `008_exercises_table_and_rls.sql`, `src/types/db.ts`.
- User ownership is explicit with `user_id` across user-owned tables.
  - Evidence: `supabase/migrations/001_init.sql`, `002_routines.sql`, `src/types/db.ts`.

### Supabase usage patterns
- Browser client singleton for client-only concerns.
  - Evidence: `src/lib/supabase/client.ts`.
- Request-bound server client reads auth cookie and uses anon key.
  - Evidence: `src/lib/supabase/server.ts`.
- Server anon client for global/public server reads.
  - Evidence: `src/lib/supabase/server-anon.ts`.
- Service-role admin client exists server-only (privileged tasks).
  - Evidence: `src/lib/supabase/admin.ts`, `docs/AGENT.md`.

### Auth flows touching data
- Email/password login/signup and password reset via Supabase auth.
  - Evidence: `src/app/auth/actions.ts`, `src/app/reset-password/actions.ts`, `src/app/auth/confirm/route.ts`.

### Offline/PWA/cache approach (current)
- No explicit PWA/offline sync implementation found.
  - Evidence: `package.json` (no PWA/offline deps/scripts), repository root config files.
- Server-side caching used for exercise catalog (`unstable_cache`) with tag/path revalidation.
  - Evidence: `src/lib/exercises.ts`, `src/app/actions/exercises.ts`.

---

## 5) Auth & Security (EVIDENCED)

### Auth flow shape
- Middleware gates non-public routes by checking auth cookie.
- Auth actions set access/refresh cookies after login/signup/confirm.
- Protected pages/actions call `requireUser()` and redirect if absent.
- Evidence: `middleware.ts`, `src/app/auth/actions.ts`, `src/app/auth/confirm/route.ts`, `src/lib/auth.ts`.

### RLS assumptions and enforcement
- RLS enabled on core tables.
- Policies enforce own-row select/insert/update/delete using `auth.uid()`.
- Exercise table policies allow global reads + own custom writes.
- Evidence: `supabase/migrations/001_init.sql`, `supabase/migrations/002_routines.sql`, `supabase/migrations/008_exercises_table_and_rls.sql`, `docs/AGENT.md`.

### Server-side endpoint/validation patterns
- Server actions validate minimal required inputs and scope queries by `user_id`.
- Route handler `/auth/confirm` validates OTP/code and handles failure redirects.
- Custom exercise delete checks dependent usage before deletion.
- Evidence: `src/app/actions/exercises.ts`, `src/app/auth/confirm/route.ts`, `src/app/routines/page.tsx`, `src/app/session/[id]/page.tsx`.

### Security constraints in docs
- Service role key must not be exposed to frontend.
- Frontend must use anon key only.
- Evidence: `docs/AGENT.md`, `src/lib/env.ts`, `src/lib/supabase/admin.ts`.

---

## 6) Workflow Discipline (EVIDENCED)

### Scripts and checks
- Available scripts: `dev`, `build`, `start`, `lint`.
  - Evidence: `package.json`.
- Merge-worthiness and done criteria explicitly require build + lint + manual flow test.
  - Evidence: `CODEX.md`, `docs/AGENT.md`, `docs/PLAYBOOK/CHECKLISTS/pr-checklist.md`.

### CI status
- Planned (not yet implemented): explicit CI pipeline contract.
  - Evidence: `docs/PLAYBOOK/DECISIONS.md` (TODO section).

### Changelog discipline
- Non-trivial changes must update `docs/CHANGELOG.md` with WHAT + WHY and avoid implementation-detail dumps.
  - Evidence: `CODEX.md`, `docs/PLAYBOOK/CHECKLISTS/pr-checklist.md`, current style in `docs/CHANGELOG.md`.

### Commit conventions
- No explicit commit-message convention documented in current repo guidance.
  - Evidence: `CODEX.md`, `docs/AGENT.md`, `docs/PLAYBOOK/CHECKLISTS/pr-checklist.md`.

---

## 7) Reusable Assets

- Supabase client factories for browser/server/server-anon/admin usage.
  - Evidence: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/server-anon.ts`, `src/lib/supabase/admin.ts`.
- Auth guard helper (`requireUser`) reusable across protected routes/actions.
  - Evidence: `src/lib/auth.ts`.
- Timezone + routine-day helpers reusable for all date-dependent planning logic.
  - Evidence: `src/lib/routines.ts`.
- Profile bootstrap helper to guarantee required user context.
  - Evidence: `src/lib/profile.ts`.
- Exercise loading/normalization/cache utilities + action handlers for custom exercise CRUD.
  - Evidence: `src/lib/exercises.ts`, `src/app/actions/exercises.ts`.
- Playbook assets already in repo (principles, patterns, checklists, codex prompts) for repeatable execution.
  - Evidence: `docs/PLAYBOOK/INDEX.md`, `docs/PLAYBOOK/PRINCIPLES.md`, `docs/PLAYBOOK/PATTERNS/*`, `docs/PLAYBOOK/CHECKLISTS/*`, `docs/PLAYBOOK/PROMPTS/*`.

---

## 8) Gaps / TODOs (STRICT)

- TODO: Define and enforce CI workflow (at minimum lint + build gates).
  - Next decision: choose CI platform/workflow file conventions and required checks.
  - Why: current quality gates are documented but not automatically enforced in repo workflows.
  - Evidence: `package.json`, `docs/PLAYBOOK/DECISIONS.md` (CI TODO), `CODEX.md`, `docs/AGENT.md`.

- TODO: Document migration rollout policy (sequence, fallback expectations, rollback posture).
  - Next decision: codify migration run order and “code vs schema” deploy sequencing.
  - Why: code contains transitional fallbacks, indicating rollout risk is real and recurring.
  - Evidence: `docs/PLAYBOOK/DECISIONS.md` (migration TODO), `src/lib/exercises.ts`, `docs/CHANGELOG.md`, `supabase/migrations/*.sql`.

- TODO: Define environment contract document (`.env.example` + required vars by environment).
  - Next decision: add a single source of truth for local/staging/prod env vars.
  - Why: env requirements exist in code but are not consolidated into a dedicated setup artifact.
  - Evidence: `src/lib/env.ts`, root file list (no `.env.example`), `docs/AGENT.md`.

- TODO: Decide whether to add explicit API-level input schema validation (e.g., shared validator layer).
  - Next decision: keep current minimal validation or adopt centralized validation for critical mutations.
  - Why: current pattern is intentionally minimal and mostly route-local; this is acceptable but not yet standardized.
  - Evidence: `docs/AGENT.md` ("Validate inputs minimally"), `src/app/actions/exercises.ts`, `src/app/session/[id]/page.tsx`.
