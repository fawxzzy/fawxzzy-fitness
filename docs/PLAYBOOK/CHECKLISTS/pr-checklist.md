# PR Checklist

- [ ] Read `CODEX.md` and `docs/AGENT.md` before non-trivial changes.
- [ ] Ensure change aligns with product priorities (speed, deterministic logic, no bloat).
- [ ] Confirm no server/client boundary violations (`server-only` and `client-only` imports respected).
- [ ] If touching data model, confirm `user_id` ownership and RLS impact were handled.
- [ ] Update `docs/CHANGELOG.md` with WHAT + WHY (no implementation detail dump).
- [ ] Run lint and build successfully.
- [ ] Manually verify core flow: `/login → /today → Start Session → Log Set → History`.

Evidence: `CODEX.md`, `docs/AGENT.md`, `docs/CHANGELOG.md`.
