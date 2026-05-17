This file is a project-local inbox for repo-specific Playbook notes that may later be promoted upstream.

## PROPOSED
## 2026-05-14 - Discord access should verify possession of an app session, not knowledge of an email
- Type: Guardrail
- Summary: Discord membership gates should use a short-lived token generated from an authenticated app session instead of accepting email-only proof.
- Rule: Email knowledge is not identity proof.
- Failure Mode: A user can unlock Discord by entering another member's email.
- Evidence: src/app/api/discord/verification-token/route.ts, src/app/api/discord/verify/route.ts, supabase/migrations/20260514120000_054_discord_verification_tokens.sql
- Status: Proposed

## 2026-05-11 - Narrow DAL slices should extract one authenticated mutation at a time
- Type: Pattern
- Summary: Fitness should prove Atlas-aligned server boundaries by moving one authenticated persistence path at a time into `src/lib/dal/*`, while server actions retain validation, user lookup, and revalidation ownership.
- Suggested Playbook File: docs/PATTERNS/owner-repo-dal-slices.md
- Rationale: Small DAL slices keep regressions attributable and prove the owner-repo boundary before any shared auth/data package discussion.
- Rule: Server action owns request validation and revalidation; DAL owns authenticated persistence mutation.
- Pattern: Delete routine is a good second DAL slice because it has a narrow read-delete-replace-update shape.
- Failure Mode: Extracting create, update, and delete together makes routine behavior regressions difficult to isolate.
- Evidence: src/app/routines/actions.ts, src/lib/dal/routine-delete.ts, src/lib/dal/routine-delete.test.ts
- Status: Proposed

## 2026-05-11 - Contract workflows should fail inside observable jobs, not before job creation

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

## 2026-05-15 - Feedback duplicates should fold on normalized signal and clean up resolved display threads
- Type: Pattern
- Summary: Feedback duplicate handling should compare normalized report signals rather than exact raw strings, while duplicate and withdrawn forum threads clean up as display-state cleanup after the queue row is updated.
- Rule: Duplicate detection should compare normalized area, summary, and short-detail tokens, not exact message text alone.
- Rule: Supabase remains the bounded index; duplicate or withdrawn forum threads may be deleted once their synced display state is updated.
- Pattern: normalize feedback signal -> fold into active queue row -> sync tags and starter post -> delete duplicate or withdrawn display thread.
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

## 2026-05-16 - Feedback attachments and decoration must stay bounded and fail-soft
- Type: Guardrail
- Summary: Feedback intake may support screenshots and visual polish, but file bytes should stay in Discord, Supabase should store bounded metadata only, and optional decoration must not break the core report path.
- Rule: Feedback attachments are Discord-hosted evidence, not app database blobs.
- Rule: Custom emoji decoration must be validated and fail-soft.
- Pattern: defer interaction -> bounded row -> forum thread with optional attachments -> edit response with final status.
- Failure Mode: A successful forum post appears while the reporter sees a failed response because the interaction was not deferred or decoration failed.
- Status: Proposed

## 2026-05-16 - Discord emoji resources must be bootstrapped, not inferred from attachments
- Type: Guardrail
- Summary: Bot UI emoji should come from controlled application-owned or guild-owned emoji resources, not from ordinary uploaded image attachments.
- Rule: Custom emoji are decoration, not core workflow.
- Pattern: local asset -> Discord emoji resource -> env ID -> validated UI usage.
- Failure Mode: Treating an uploaded image attachment like an emoji resource breaks Discord component payloads and creates false config drift.
- Status: Proposed

## 2026-05-16 - Feedback cards should be type-aware display, not one generic bug form
- Type: Pattern
- Summary: Bug and Feature feedback can share bounded storage, but their public Discord cards should use type-aware labels so feature requests do not read like bug reports.
- Rule: Shared storage does not require identical user-facing copy.
- Pattern: common feedback row -> type-aware forum card -> status reaction -> optional sync script.
- Failure Mode: Showing severity and `What happened` on feature requests makes the feedback board feel awkward and bug-only.
- Status: Proposed

## 2026-05-16 - Feedback forum can be a visible board, but Playbook/ATLAS remain reviewed truth
- Type: Pattern
- Summary: Discord feedback cards can act like a lightweight Jira board, while Supabase keeps bounded records and Playbook/ATLAS only receive reviewed exports/tasks.
- Rule: Discord board state is operational signal, not engineering truth by itself.
- Pattern: Feedback forum card -> status tags -> board export -> reviewed Codex task / Playbook triage.
- Failure Mode: Treating every forum post as automatic engineering truth creates noisy task churn.
- Status: Proposed

## 2026-05-16 - Feedback board exports are Verta Core planning input, not automatic truth
- Type: Pattern
- Summary: The Discord Feedback forum can behave like a lightweight Jira board, but Verta Core / Playbook should consume exported board artifacts as reviewed planning input before Codex work begins.
- Rule: Discord board state is operational signal, not engineering truth.
- Pattern: Feedback forum card -> bounded Supabase row -> board export -> Verta Core triage -> reviewed Codex task.
- Failure Mode: Treating every forum card as automatic engineering truth creates noisy sprint churn.
- Status: Proposed

## 2026-05-16 - Feedback workflow should promote reviewed exports, not duplicate raw task copies
- Type: Guardrail
- Summary: The Feedback forum is the visible community board, but the durable workflow should move through bounded rows, reviewed board exports, reviewed Codex prompts, and curated update posts rather than automatic copies into ATLAS, GitHub, or `#updates`.
- Rule: Feedback card updates should stay in the forum thread as audit comments, not automatic release posts.
- Rule: Update Bot posts are curated user-facing announcements, not card mutation logs.
- Rule: ATLAS should receive reviewed summaries, not every raw feedback card.
- Rule: No direct Discord-to-ATLAS or Discord-to-GitHub writes in this lane.
- Pattern: feedback card -> audit comments -> board export -> Verta Core or Playbook review -> reviewed Codex task -> curated update post when user-facing.
- Failure Mode: Duplicating raw cards into ATLAS, GitHub, or the updates channel creates noisy and conflicting task truth.
- Status: Proposed

## 2026-05-16 - Feedback card mutations should leave thread-visible audit comments
- Type: Pattern
- Summary: When the bot changes a feedback card, it should post a compact thread comment so the forum itself shows a readable modification history.
- Rule: Bot-driven board changes should be visible in the card thread.
- Pattern: mutate bounded feedback row -> update forum card/tags -> post compact audit comment.
- Failure Mode: Silent card edits make the feedback forum feel inconsistent and hard to trust as a board.
- Status: Proposed

## 2026-05-15 - Member-number display sync should queue Discord side effects
- Type: Pattern
- Summary: Database compaction should update app truth and queue Discord nickname resync, while Discord API calls happen through a server sync path that can retry failures.
- Rule: Database triggers should not call Discord directly.
- Pattern: profile compaction -> stale Discord link marker -> protected sync endpoint or script -> nickname update.
- Failure Mode: Changing member numbers in DB without queuing nickname sync leaves Discord display stale.
- Status: Proposed

## 2026-05-16 - Discord production update posts should be curated user communication
- Type: Guardrail
- Summary: Vercel production deployments can trigger update drafts, but public Discord posts must be curated for users rather than copied from raw deployment metadata.
- Rule: Deployment metadata is input, not release copy.
- Rule: Only production deployments for the Fitness project should create update drafts.
- Rule: Discord update posts should be safe for users of any age and background.
- Rule: Published update posts should stay single-heading, start with `@everyone`, and suppress link previews.
- Pattern: production deployment event -> bounded draft -> admin curated publish -> Discord update post.
- Failure Mode: Raw changelog or deployment posts confuse users and leak irrelevant implementation details.
- Status: Proposed

## 2026-05-16 - Supabase migration parity must be restored before routine DB changes
- Type: Guardrail
- Summary: Discord rollout required surgical migration applies because local and remote migration history drifted.
- Rule: Do not repair production migration history opportunistically during feature deploys.
- Pattern: inventory remote history -> recover local migration files -> validate -> resume normal db workflow.
- Failure Mode: Continuing feature work on a drifted migration chain forces every DB change into manual or surgical paths.
- Status: Proposed

## 2026-05-16 - Supabase migration ledger repair should require schema evidence
- Type: Guardrail
- Summary: Discord rollout migration drift was resolved by proving production schema effects before marking missing migration versions as applied.
- Rule: Migration ledger repair requires schema evidence first.
- Pattern: verify effects -> repair exact versions -> validate -> document.
- Failure Mode: Blind migration repair can make the ledger claim schema history that production does not actually have.
- Status: Proposed

## 2026-05-16 - Moderation should be reversible before punitive
- Type: Guardrail
- Summary: Fawx Security moderation should isolate users into Purgatory by reversible roles and logged cases rather than defaulting to bans.
- Rule: No full bans by default.
- Rule: Every moderation action needs a case record and release path.
- Pattern: staff command -> role isolation -> Purgatory channel -> logged case -> release/restore.
- Failure Mode: Silent bans or destructive moderation actions create drama and make recovery harder.
- Status: Proposed
