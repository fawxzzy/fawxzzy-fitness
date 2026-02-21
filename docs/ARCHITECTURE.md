# Architecture

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)

## Folder Structure Overview
- `src/app`: App Router routes, layouts, and server actions.
- `src/lib`: Shared utilities (including Supabase client/server helpers).
- `src/components`: Reusable UI components.
- `supabase/migrations`: SQL schema and policy migrations.

## Data Model Overview
Core entities currently include:
- `profiles`: per-user settings and routine linkage.
- `routines`, `routine_days`, `routine_day_exercises`: workout plan structure.
- `sessions`, `session_exercises`, `sets`: workout execution and logged performance.
- `exercises`: global/custom exercise catalog.

All user-owned rows are expected to remain protected by RLS and tied to `user_id` where applicable.
