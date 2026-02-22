# Architecture

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)

## Architectural Principles
- Keep server/client boundaries explicit and stable.
- Route all database writes through server actions.
- Require authenticated server context for protected mutations (`requireUser()` + `supabaseServer()`).
- Preserve RLS as the primary data-access safety boundary.
- Favor the smallest clear change over new abstraction layers.

## Folder Structure Overview
- `src/app`: App Router routes, layouts, and server actions.
- `src/lib`: Shared utilities (including Supabase client/server helpers).
- `src/components`: Reusable UI components.
- `supabase/migrations`: SQL schema and policy migrations.

## Execution Boundaries
- Server components and server actions own data reads/writes against Supabase.
- Client components handle presentation and interaction state only.
- Client-side database writes are not allowed.

## Data Model Overview
Core entities currently include:
- `profiles`: per-user settings and active routine linkage.
- `routines`, `routine_days`, `routine_day_exercises`: workout plan structure.
- `sessions`, `session_exercises`, `sets`: workout execution and logged performance.
- `exercises`: global/custom exercise catalog.

All user-owned rows are expected to remain protected by RLS and tied to `user_id` where applicable.

## Change Management Rule
Any future architectural change that alters boundaries, ownership, or data flow should be documented here before or alongside implementation to prevent undocumented drift.
