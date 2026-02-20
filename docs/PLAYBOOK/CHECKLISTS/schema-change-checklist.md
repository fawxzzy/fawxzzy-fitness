# Schema Change Checklist

- [ ] Add a new migration in `supabase/migrations/` (incremental numbered SQL file).
- [ ] Enable/maintain RLS for new/changed user-owned tables.
- [ ] Add/adjust select/insert/update/delete policies for ownership.
- [ ] Ensure all user-owned rows include `user_id` and app writes it.
- [ ] Validate foreign key delete behavior aligns with history safety expectations.
- [ ] Check app code paths for transitional fallback needs during staged rollout.
- [ ] Update TypeScript DB types if schema shape changed (`src/types/db.ts`).
- [ ] Update `docs/CHANGELOG.md` (WHAT + WHY).

Evidence: `supabase/migrations/*.sql`, `src/types/db.ts`, `src/lib/exercises.ts`, `docs/AGENT.md`.
