# Fawxzzy-Fitness Repo Rules

Scope
- Applies to `repos/fawxzzy-fitness`.

Purpose
- Use this file as the repo-local entrypoint required by ATLAS stack policy.
- The existing product-specific guide in `AGENT.md` remains the authoritative local behavior document for terminology, UI rhythm, and architectural preferences.

Rules
- Read `AGENT.md` before making repo-local product decisions.
- Keep edits aligned with the deterministic fitness product model already defined there.
- Treat every Vercel production deploy, promotion, rollback/promotion, or production-alias cutover as approval-gated.
- Do not run any production-targeting Vercel mutation for Fitness unless the operator explicitly says so in the current thread with wording such as `deploy to prod`, `deploy to production`, or `promote Fitness on Vercel`.
- Generic approval such as `continue`, `proceed`, `do it`, or broad batch approval does not count as Vercel production deploy approval.
- Before any live Fitness Discord board/forum/update-post mutation, read the ATLAS-root access doc `docs/ops/FITNESS-DISCORD-ACCESS-PATH-2026-06-18.md` and prove the DiscordOS bot path first with:
  - `npm run ops:production-env:run -- npm run ops:discordos:env-readiness:json` in `repos/DiscordOS`
- Do not claim `blocked for lack of browser control` until that DiscordOS readiness proof fails or is unavailable.

Verification
- Run the repo-local verify command documented in the repo before claiming completion.
