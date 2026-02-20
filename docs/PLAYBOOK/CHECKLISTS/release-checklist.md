# Release Checklist

- [ ] Review `docs/CHANGELOG.md` and add release-ready WHAT + WHY notes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run manual core flow: `/login → /today → Start Session → Log Set → History`.
- [ ] Verify auth-confirm and password reset links resolve correctly.
- [ ] Confirm required env vars are present (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only keys where needed).
- [ ] Confirm no static export setup was introduced.

Evidence: `CODEX.md`, `docs/AGENT.md`, `src/lib/env.ts`, `middleware.ts`.
