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
- Evidence: Settings Discord Connector UI and /api/discord/verification-token
- Status: Proposed

## 2026-05-15 - Discord interactions should be signed HTTP when hosted by Fitness
- Type: Guardrail
- Summary: Fitness can host Discord interaction handling only when every request is verified with Discord's Ed25519 signature before parsing or executing interaction payloads.
- Rule: Unsigned Discord interaction payloads must never reach role-grant logic.
- Pattern: Discord HTTP interaction endpoint verifies signature, handles modal proof, consumes Fitness token, then grants the Discord role through REST.
- Failure Mode: Accepting unsigned interaction requests lets arbitrary callers attempt Discord role grants.
- Evidence: src/app/api/discord/interactions/route.ts, src/lib/discord/interaction-signature.ts, src/lib/discord/rest.ts
- Status: Proposed

## 2026-05-15 - Discord member numbers should display compact public member slots, not permanent identity
- Type: Guardrail
- Summary: Discord can display Fitness member numbers after verification, but those numbers are current public slots that compact after human deletions while keeping Zac reserved as `#0`.
- Rule: Zac owns `#0`; public member numbers compact from `#1`.
- Rule: Automation accounts must not consume public member numbers.
- Pattern: profile compaction -> link refresh -> Discord nickname sync.
- Failure Mode: changing DB member numbers without refreshing Discord link snapshots and guild nicknames leaves the server showing stale member numbers.
- Evidence: public.profiles.user_number, public.discord_member_links, Discord verification flow
- Status: Proposed

## 2026-05-15 - Discord feedback reports should enter a governed queue before repo truth
- Type: Guardrail
- Summary: Discord user feedback should be captured as structured review-queue records before Playbook, ATLAS, or GitHub issues promote them into durable engineering truth.
- Rule: User feedback is input signal, not repo truth.
- Rule: Discord must not write directly to ATLAS or GitHub issues without review.
- Pattern: Discord /feedback modal -> structured Supabase queue -> Playbook export or triage -> reviewed issue or Codex task.
- Failure Mode: Writing every Discord report directly into ATLAS creates noisy, abusive repo history.
- Evidence: public.discord_feedback_reports, /api/discord/interactions, scripts/export-discord-bug-reports.mjs
- Status: Proposed

## 2026-05-15 - Discord feedback reports should stay bounded and review-queued
- Type: Guardrail
- Summary: Discord feedback should be stored as small structured signals with bounded fields, duplicate folding, and retention controls before any reviewed promotion into ATLAS, Playbook, or GitHub.
- Rule: Feedback reports are bounded signals, not blob storage.
- Rule: Screenshots and logs should be links or reviewed artifacts, not raw stored payloads.
- Pattern: Discord /feedback modal -> bounded Supabase row -> duplicate folding -> export or prune -> reviewed promotion.
- Failure Mode: Unbounded text, raw payloads, files, or direct repo writes turn support intake into storage abuse.
- Evidence: public.discord_feedback_reports, scripts/export-discord-bug-reports.mjs, scripts/prune-discord-bug-reports.mjs
- Status: Proposed

## 2026-05-15 - Discord forum feedback boards need source-of-truth status sync
- Type: Pattern
- Summary: Discord forum posts can make feedback visible, but status tags should be synced from the structured report queue so the forum remains a display surface rather than the only source of truth.
- Rule: Forum tags are display state; Supabase remains the bounded index.
- Rule: Reporter mentions must be explicit and controlled with allowed_mentions.
- Pattern: Structured report row -> forum thread -> type and status tags -> staff status command -> synced row and thread update.
- Failure Mode: Manual-only forum tags drift from the review queue and make Playbook exports unreliable.
- Status: Proposed

## 2026-05-15 - Feedback creators should withdraw details, not raw-delete review history
- Type: Guardrail
- Summary: Feedback reporters may withdraw their own details, but the system should keep bounded audit metadata so duplicates, triage, and Playbook exports remain trustworthy.
- Rule: User-facing delete should mean withdraw or redact by default, not destructive history loss.
- Rule: Forum posts are display state; Supabase remains the bounded index.
- Pattern: Feedback modal -> bounded report row -> forum thread -> reporter withdraw or status update -> reviewed promotion.
- Failure Mode: Raw user deletion breaks duplicate tracking and makes triage history unreliable.
- Status: Proposed

## 2026-05-15 - Feedback duplicates should fold on normalized signal and archive resolved display threads
- Type: Pattern
- Summary: Feedback duplicate handling should compare normalized report signals rather than exact raw strings, while duplicate and withdrawn forum threads archive as display-state cleanup after the queue row is updated.
- Rule: Duplicate detection should compare normalized area, summary, and short-detail tokens, not exact message text alone.
- Rule: Supabase remains the bounded index; duplicate or withdrawn forum threads may archive once their synced display state is updated.
- Pattern: normalize feedback signal -> fold into active queue row -> sync tags and starter post -> archive duplicate or withdrawn display thread.
- Failure Mode: Exact-string-only duplicate checks miss obvious repeats, and leaving resolved duplicate threads open turns the forum into a noisy board.
- Status: Proposed

## 2026-05-15 - Discord feedback should use setup commands for admins and buttons for users
- Type: Pattern
- Summary: Setup and moderation commands should stay admin-facing, while normal feedback interactions should be available through persistent buttons and modals.
- Rule: Admin/setup commands are not normal-user UX.
- Pattern: Admin slash command -> persistent panel -> user button -> modal -> bounded feedback row.
- Failure Mode: Making users memorize slash commands hides the feedback workflow and lowers participation.
- Status: Proposed

## 2026-05-15 - Feedback type selection belongs inside the feedback flow
- Type: Pattern
- Summary: Feedback users should open one general feedback flow and choose Bug or Feature inside the modal instead of selecting command variants up front.
- Rule: Feedback UX should minimize command-picker decisions.
- Pattern: General feedback button -> modal with type choice -> bounded feedback row -> forum thread/tags.
- Failure Mode: Pre-selecting too many slash-command variants makes feedback feel like an admin workflow instead of a user workflow.
- Status: Proposed

## 2026-05-16 - Feedback intake should not depend on optional Discord decoration
- Type: Guardrail
- Summary: Feedback submission success should depend on storing the bounded report and creating the forum post, not on optional emoji or tag decoration.
- Rule: Optional Discord decoration must fail soft.
- Pattern: Core report write -> forum thread -> optional decoration -> success response.
- Failure Mode: A valid report appears in the forum while the user sees a failure because a non-critical decoration step failed.
- Status: Proposed

## 2026-05-15 - Member-number display sync should queue Discord side effects
- Type: Pattern
- Summary: Database compaction should update app truth and queue Discord nickname resync, while Discord API calls happen through a server sync path that can retry failures.
- Rule: Database triggers should not call Discord directly.
- Pattern: profile compaction -> stale Discord link marker -> protected sync endpoint or script -> nickname update.
- Failure Mode: Changing member numbers in DB without queuing nickname sync leaves Discord display stale.
- Status: Proposed
