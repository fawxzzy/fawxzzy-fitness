# AGENT RULES – Fawxzzy Fitness

Before making any non-trivial change:

Read:
- docs/PROJECT.md
- docs/ENGINE.md
- docs/CHANGELOG.md

Assume these define constraints.

Do not introduce changes that conflict with product priorities.

---

## Architecture Rules

- Server-only utilities must never be imported into client components.
- Supabase browser client and server client must remain separate.
- All user-owned rows must include user_id.
- RLS must remain enabled and enforced.
- Do not enable static export.

---

## Progression Philosophy

Deterministic.
Reps first, then weight.
User-selectable aggressiveness.
No black-box AI.

Internal metrics may inform decisions but must not create opaque behavior.

---

## Code Rules

- Keep files small.
- Avoid unnecessary libraries.
- No premature abstraction.
- Optimize for clarity and speed.
- Validate inputs minimally.
- No dead code.

---

## Deployment Safety

- Never expose Supabase service role key.
- Only use anon key in frontend.
- Auth routes must remain dynamic.
- App must build and deploy cleanly.

---

## PR Definition of Done

A change is complete only if:
- npm run build succeeds
- Lint passes
- Manual test works:
  /login → /today → Start Session → Log Set → History
