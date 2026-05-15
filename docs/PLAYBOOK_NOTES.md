This file is a project-local inbox for repo-specific Playbook notes that may later be promoted upstream.

## PROPOSED
## 2026-05-14 - Discord access should verify possession of an app session, not knowledge of an email
- Type: Guardrail
- Summary: Discord membership gates should use a short-lived token generated from an authenticated app session instead of accepting email-only proof.
- Rule: Email knowledge is not identity proof.
- Failure Mode: A user can unlock Discord by entering another member's email.
- Evidence: src/app/api/discord/verification-token/route.ts, src/app/api/discord/verify/route.ts, supabase/migrations/20260514120000_054_discord_verification_tokens.sql
- Status: Proposed

## 2026-05-15 - Discord verification proof should be user-copyable but not persisted
- Type: Guardrail
- Summary: Fitness may show a one-time Discord token after generation, but the token must stay ephemeral and must not be stored in profile state, URLs, localStorage, or logs.
- Rule: Verification tokens are display-once session UI state, not account data.
- Pattern: Generate token from authenticated session, show readonly copy box, then Discord consumes it once.
- Failure Mode: Persisting verification tokens turns a short-lived proof into reusable account state.
- Evidence: Settings Discord Access UI and /api/discord/verification-token
- Status: Proposed

## 2026-05-15 - Discord interactions should be signed HTTP when hosted by Fitness
- Type: Guardrail
- Summary: Fitness can host Discord interaction handling only when every request is verified with Discord's Ed25519 signature before parsing or executing interaction payloads.
- Rule: Unsigned Discord interaction payloads must never reach role-grant logic.
- Pattern: Discord HTTP interaction endpoint verifies signature, handles modal proof, consumes Fitness token, then grants the Discord role through REST.
- Failure Mode: Accepting unsigned interaction requests lets arbitrary callers attempt Discord role grants.
- Evidence: src/app/api/discord/interactions/route.ts, src/lib/discord/interaction-signature.ts, src/lib/discord/rest.ts
- Status: Proposed
