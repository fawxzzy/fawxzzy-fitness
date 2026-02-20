# Playbook Conventions

Conventions observed in current repo code and docs.

## Naming and routing
- App Router file-based routes under `src/app/**/page.tsx` and route handlers under `route.ts`.
- Dynamic segments use bracket notation (e.g., `history/[sessionId]`, `session/[id]`).
- Server actions are commonly grouped in `actions.ts` within feature folders.
- Evidence: `src/app/**` structure.

## Module boundaries
- Server-only utilities include `import "server-only"`.
- Browser-only Supabase client includes `import "client-only"`.
- Shared imports use TS path alias `@/*`.
- Evidence: `src/lib/auth.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `tsconfig.json`.

## Data access pattern
- Authenticated data access: `requireUser()` then `supabaseServer()`.
- Query filters repeatedly include `.eq("user_id", user.id)`.
- Insert rows include `user_id` for ownership integrity.
- Evidence: `src/app/today/page.tsx`, `src/app/actions/exercises.ts`, `src/lib/session-targets.ts`.

## Supabase client roles
- `supabaseServer()` for request-bound user operations.
- `supabaseServerAnon()` for server-side public/global reads.
- `supabaseAdmin()` reserved for service-role server tasks.
- Evidence: `src/lib/supabase/server.ts`, `src/lib/supabase/server-anon.ts`, `src/lib/supabase/admin.ts`.

## Error handling and user messaging
- Form/server action failures often redirect with URL query messages (`error`, `success`, `info`).
- Critical operation failures throw server errors when redirect fallback is not available.
- Targeted console logging is used for operational debugging.
- Evidence: `src/app/actions/exercises.ts`, `src/app/auth/actions.ts`, `src/lib/exercises.ts`.

## Cache and revalidation
- Global exercise list uses `unstable_cache` keying.
- Mutations invalidate with `revalidateTag` and `revalidatePath`.
- Evidence: `src/lib/exercises.ts`, `src/app/actions/exercises.ts`.

## Styling
- Tailwind utility classes are used directly in components/pages.
- Accent color tokens are CSS-variable-backed via Tailwind theme extension.
- Evidence: `tailwind.config.ts`, `src/app/login/page.tsx`, `src/app/globals.css`.

## Environment variables
- Required env vars are loaded through helper functions that throw explicit errors when missing.
- Public Supabase keys are prefixed with `NEXT_PUBLIC_`; service role key is server-only.
- Evidence: `src/lib/env.ts`, `docs/AGENT.md`.
