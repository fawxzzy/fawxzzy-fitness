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
- Do not introduce new structural layers without clear, documented justification.

## Folder Structure Overview
- `src/app`: App Router routes, layouts, and server actions.
- `src/lib`: Shared utilities (including Supabase client/server helpers).
- `src/components`: Reusable UI components.
- `supabase/migrations`: SQL schema and policy migrations.

## Execution Boundaries
- Server components and server actions own data reads/writes against Supabase.
- Server actions should return the standard action contract for non-navigation outcomes: `ActionResult<T> = { ok: true, data?: T } | { ok: false, error: string }`.
- Use redirects only for true navigation outcomes (route transitions), not for in-place mutation error handling.
- Client components handle presentation and interaction state only.
- Client-side database writes are not allowed.
- Protected mutations must execute in strict server actions using `requireUser()` and `supabaseServer()`.

## Data Model Overview
Core entities currently include:
- `profiles`: per-user settings and active routine linkage.
- `routines`, `routine_days`, `routine_day_exercises`: workout plan structure.
- `sessions`, `session_exercises`, `sets`: workout execution and logged performance.
- `exercises`: global/custom exercise catalog.

All user-owned rows are expected to remain protected by RLS and tied to `user_id` where applicable.

## Change Management Rule
Any future architectural change that alters boundaries, ownership, or data flow should be documented here before or alongside implementation to prevent undocumented drift.

## Architecture Compliance Checklist
- Verify requested changes align with this architecture contract before coding.
- If a requested change conflicts with these boundaries, propose a compliant alternative first.
- Keep diffs minimal and explicit; avoid speculative abstractions.


## Asset & Binary File Policy
- Prefer text-based assets (SVG/CSS) in product changes unless binary media is explicitly required.
- Treat review environments as binary-restricted by default: avoid adding `.webp`, `.png`, `.jpg`, `.mp4`, or other binary payloads in normal feature PRs.
- Store exercise media references as paths/URLs in the database (`image_*_path`) so real media can move to Supabase Storage without UI contract changes.
- Keep placeholder asset paths stable and resolve missing paths gracefully in UI components.
