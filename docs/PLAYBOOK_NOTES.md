This file is a project-local inbox for repo-specific Playbook notes that may later be promoted upstream.

## PROPOSED

## 2026-07-27 - Installation is an earned or explicit action, never an app-entry gate
- Type: Guardrail
- WHAT changed: Normal root, login, signup, password recovery, and reset entry no longer redirect through the install guide; the complete install presentation remains available at `/install`, and earned prompts remain on post-value app surfaces.
- WHY it changed: An aggregate review checkpoint reintroduced install-first routing after the earned-install contract had already removed it, causing visible install-screen flicker, slower app entry, and browser users being blocked behind a presentation they did not request.
- Rule: App and authentication entry must render or hand off directly without visiting `/install`; install UI may appear only from an explicit install route or a capability-aware earned prompt.
- Pattern: root -> authenticated entry resolver -> app or login, with explicit `/install` and earned promotion remaining independent.
- Failure Mode: Reusing the install guide as a routing gate makes a valid presentation behave like a startup regression and obscures the actual app while hydration redirects settle.
- Evidence: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/components/install/ProtectedAppInstallGate.tsx`, `src/lib/install/config.test.ts`
- Status: Proposed

## 2026-07-24 - Curated onboarding screens should keep shared, reviewable progress contracts while allowing safe in-progress navigation
- Type: Pattern
- WHAT changed: Curated onboarding now treats selected sections and required controls as completion status indicators, allows page navigation with explicit incomplete-state highlighting, and updates review/dropdown visibility and button/label UX while preserving the stricter "complete" contract when review-ready handoff is attempted.
- WHY it changed: The onboarding flow needed clearer user feedback and less rigid gating for exploratory edits, plus consistent completed/incomplete state surfacing across section summaries and in-page controls.
- Rule: Required onboarding responses should still be enforced before Review advancement, but the screen should explicitly mark incomplete inputs and pages instead of blocking all forward navigation.
- Pattern: shared selector-derived progression state + section completion indicators + deterministic malformed-response filtering + explicit review-safe advancement checks.
- Evidence: `src/app/curated-onboarding/page.tsx`, `src/app/dev/curated-onboarding/page.tsx`, `src/app/routines/CreateRoutineClient.tsx`, `src/app/routines/CreateRoutineRouteHeader.contract.test.ts`, `src/app/routines/RoutinesPageClient.contract.test.ts`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/page.tsx`, `src/features/curated-onboarding/components/ConstraintsStep.tsx`, `src/features/curated-onboarding/components/CuratedIntroStep.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingPrimitives.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingProgress.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingShell.tsx`, `src/features/curated-onboarding/components/EquipmentStep.tsx`, `src/features/curated-onboarding/components/ExperienceStep.tsx`, `src/features/curated-onboarding/components/GenerationHandoffStep.tsx`, `src/features/curated-onboarding/components/GoalsStep.tsx`, `src/features/curated-onboarding/components/PreferencesStep.tsx`, `src/features/curated-onboarding/components/QuestionnaireStep.tsx`, `src/features/curated-onboarding/components/ReviewStep.tsx`, `src/features/curated-onboarding/components/ScheduleStep.tsx`, `src/features/curated-onboarding/constants.ts`, `src/features/curated-onboarding/engine.test.ts`, `src/features/curated-onboarding/engine.ts`, `src/features/curated-onboarding/fixtures.ts`, `src/features/curated-onboarding/questionnaire.test.ts`, `src/features/curated-onboarding/questionnaire.ts`, `src/features/curated-onboarding/schema.ts`, `src/features/curated-onboarding/selectors.test.ts`, `src/features/curated-onboarding/selectors.ts`, `src/features/curated-onboarding/step-registry.ts`, `src/features/curated-onboarding/storage.test.ts`, `src/features/curated-onboarding/storage.ts`, `src/features/curated-onboarding/types.ts`, `tailwind.config.ts`, `tests/curated-onboarding-ui-contract.test.mjs`, `docs/CHANGELOG.md`
- Status: Proposed
## 2026-07-14 - Explicit deployment classification must outrank the CI execution context
- Type: Guardrail
- WHAT changed: Atlas health contracts now classify explicit Vercel production and preview values before the inherited CI execution signal.
- WHY it changed: GitHub Actions runs with `CI=true`; treating that runner context as the highest-priority environment caused production and preview contract fixtures to be misclassified as CI even when they intentionally set Vercel deployment values.
- Rule: Runtime deployment classification should prefer explicit deployment metadata over the fact that the current process is executing in CI.
- Evidence: `src/lib/atlas-contracts.ts`, `src/lib/atlas-contracts.test.ts`, hosted Atlas contracts run `29355735323`.
- Status: Proposed

## 2026-06-28 - Compact mobile routine and exercise cards should share the same title-width and goal-summary contracts
- Type: Pattern
- WHAT changed: The mobile routine browse cards, workout-plan cards, day recap tiles, Today rows, and session exercise cards were tightened onto the same compact spacing rules by shrinking right-edge chrome padding, rebalancing compact title/right-rail layout, and updating the regression fixture route to use shared formatted goal-summary text instead of hand-written strings.
- WHY it changed: The previous mobile surfaces were drifting apart in how much width the title column actually kept once chevrons, info buttons, and delete pills were present, which caused avoidable truncation pressure and made regression captures prove a looser mock contract than the real app surfaces.
- Rule: Compact routine and exercise cards should reserve only the padding required by their right-edge controls and should not hide title width behind inconsistent per-screen chrome offsets.
- Rule: Mobile regression fixtures should generate target/goal copy through the shared measurement-display formatter so proof screens match production cards when spacing or wrapping is reviewed.
- Pattern: shared compact title shell + shared right-edge chrome spacing + shared formatted goal-summary fixtures + route-aware mobile regression proof.
- Failure Mode: Screen-local spacing and mock-only summary strings make routine cards, Today cards, and session cards drift into different truncation, wrapping, and proof behavior even when they are supposed to represent the same compact card family.
- Evidence: `src/app/dev/mobile-regression/DevMobileRegressionRoute.tsx`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/WorkoutPlansPageClient.tsx`, `src/app/today/TodayExerciseRows.tsx`, `src/components/SessionExerciseFocus.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/components/routines/RoutineBrowseCard.tsx`, `src/components/workout/ExerciseCardStandardTitle.tsx`, `src/components/workout/ExerciseCardSurfaceChrome.ts`
- Status: Proposed

## 2026-06-26 - UI mutation passes should use checklist-first normalization and bounded data lanes
- Type: Pattern
- Summary: Fitness UI work is more reliable when every explicit edit request is turned into a checklist, the canonical surface is patched first, and mutable QA runs stay on bounded fixture or automation-user lanes instead of drifting through live user data.
- Rule: Explicit UI edit requests should be tracked item-by-item through implementation and closeout.
- Rule: Shared card and screen families should be normalized from the source presentation path, not by sibling one-off patches.
- Rule: Live-user routine or session data should be touched only when the bug itself depends on that state, and any bounded mutation must be restored or reported.
- Pattern: requested-edit checklist -> canonical surface selection -> patch -> multi-surface proof -> checklist reconciliation -> closeout.
- Failure Mode: missed edits, sibling drift, and accidental data churn keep recurring when UI work is driven by memory and ad hoc screen pokes instead of a governed mutation loop.
- Status: Proposed

## 2026-06-15 - Routine template flows should share routine-home, duplicate, and workout-plan creation contracts
- Type: Pattern
- WHAT changed: The routine template overhaul now pushes routine home, new routine duplication, and per-day workout-plan creation through shared browse-card, day-snapshot, and creation-helper contracts so routines and workout plans can be copied, reordered, and edited without each route inventing separate card markup, naming, or navigation behavior.
- WHY it changed: The feature work expanded routine setup, duplicate-source picking, inactive routine actions, and empty-day creation at the same time, which made the routine family prone to UI drift and duplicate ownership bugs unless those surfaces kept reusing the same preview depth, creation rules, and overlay shells.
- Rule: Inactive routine selection, duplicate-source selection, and routine-home preview cards should reuse the same browse-card primitives with context-specific preview depth instead of separate card implementations.
- Rule: New routine, new day, and duplicate workout-plan flows should create fresh routine-owned records, preserve reusable plan content, and avoid carrying active-state or logged-session ownership into duplicates.
- Rule: Routine progression, session settings, and info overlays should stay on the same dropdown and overlay shells used by routine setup so the workflow reads as one editor instead of stacked mini-systems.
- Pattern: shared routine browse card + shared day snapshot presentation + shared routine/day creation helpers + route-specific action wiring.
- Failure Mode: Splitting routine-template flows into screen-local card formats, duplicate record logic, or navigation rules causes routine home, duplicate setup, and workout-plan editing to drift and makes template reuse unsafe.
- Evidence: `src/app/routines/CreateRoutineClient.tsx`, `src/app/routines/CreateRoutineDayClient.tsx`, `src/app/routines/RoutineHomeClient.tsx`, `src/components/routines/RoutineBrowseCard.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/lib/routine-copy-name.ts`, `src/lib/routine-copy-name.test.ts`, `src/lib/routine-day-creation.ts`, `src/lib/routine-copy-rollback.ts`, `src/components/routines/ProgressionPlaybookEditor.tsx`
- Status: Proposed

## 2026-06-10 - Feedback board roadmap sequencing should use explicit dependency metadata
- Type: Pattern
- Summary: Feedback board cards that represent sequenced roadmap work should store explicit card ids, bounded priorities, rollout phases, and dependency links so Discord starter posts, board exports, and reviewed task packets all preserve the same execution order.
- Rule: Use explicit `card_id`, `card_phase`, `card_priority`, `depends_on`, and `dependency_notes` metadata instead of hiding sequencing in freeform notes.
- Rule: Reviewed task packets must reject unresolved dependencies, ambiguous title fallbacks, self-dependencies, and simple cycles before implementation work starts.
- Pattern: bounded feedback row metadata -> forum card metadata lines -> export-time dependency validation -> reviewed task packets that preserve phase order and blocked follow-on cards.
- Failure Mode: Letting roadmap sequencing live only in prose or auto-grouped packets causes follow-on work to start early and makes board exports lose the real dependency order.
- Evidence: `src/lib/discord/bug-reports.ts`, `scripts/feedback-card-metadata.mjs`, `scripts/export-feedback-board.mjs`, `scripts/generate-feedback-task-packets.mjs`, `docs/ops/FITNESS-FEEDBACK-BOARD.md`, `docs/ops/FITNESS-DISCORD-FEEDBACK.md`
- Status: Proposed

## 2026-06-02 - Progression v2 exercise surfaces should reuse shared display and gating contracts
- Type: Pattern
- Summary: Routine, Edit Day, Add Exercise, and Today progression surfaces should derive visible measurements, review labels, day-card summaries, and status rails from shared progression contracts instead of screen-local formatting or gating rules.
- Rule: Exercise progression UI should hide or show sections from the current active measurement inputs, not stale broad defaults.
- Rule: Today review strips should format targets and action semantics through the shared progression review display path.
- Rule: Routine and Today switch-day cards should reuse the same closed-card presentation path so status, sizing, and summary behavior stay aligned.
- Pattern: shared progression review loader/display + shared routine day card presentation + screen-specific composition only where context actually differs.
- Failure Mode: Screen-local copies drift into outdated labels, wrong measurement sets, stale action semantics, and card layout mismatches that regress independently.
- Evidence: `src/app/today/TodayDayPicker.tsx`, `src/app/today/page.tsx`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/page.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/lib/progression-review-display.ts`, `src/lib/routines.ts`
- Status: Proposed

## 2026-06-01 - Local release-readiness proof should preserve stable generated build artifacts
- Type: Pattern
- Summary: Local Fitness release-readiness proof should reuse the current app build manifest and service worker bytes when deployment metadata is unchanged so visual and release checks do not create no-op generated drift on every run.
- Rule: Local proof runs should not rewrite `src/generated/appBuildManifest.json` or `public/sw.js` unless the effective build identity actually changed.
- Rule: When no deployment commit or deployment id is present, local manifest generation may preserve the current manifest or fall back to a stable local build id instead of timestamp churn.
- Pattern: read existing manifest -> derive deployment-backed identity when available -> otherwise preserve stable local identity -> regenerate service worker only when source bytes change -> rerun readiness proof.
- Failure Mode: Timestamp-only build artifact rewrites make the worktree dirty, hide real readiness blockers behind generated noise, and break release-gate preservation checks.
- Evidence: `scripts/generate-app-build-manifest.mjs`, `scripts/generate-service-worker.mjs`, `src/generated/appBuildManifest.json`, `public/sw.js`
- Status: Proposed

## 2026-05-22 - Fitness migration readiness should preserve exact remote versions and use local-only linked DB secrets
- Type: Guardrail
- Summary: When the linked Fitness migration chain is validated locally, the repo should preserve the exact remote migration version instead of a local timestamp alias, and standalone validation may load `SUPABASE_DB_PASSWORD` from the documented local-only secret lane when the shell does not already provide it.
- Rule: If local and remote migration SQL are the same but the version differs, restore the exact remote version locally instead of carrying a new alias.
- Rule: Linked migration validation may read `secrets/local/fawxzzy-fitness-prod-db.env` for `SUPABASE_DB_PASSWORD`, but that secret must stay local-only and uncommitted.
- Pattern: inspect linked drift -> prove SQL equivalence -> restore exact remote version -> load local-only DB password for dry-run validation -> rerun migration and release readiness.
- Failure Mode: carrying a local migration alias or relying on ad hoc shell secrets keeps `migration:validate` red even when schema truth is already aligned.
- Status: Proposed
## 2026-05-19 - Public completed phase cards need visible resolved state before the next phase starts
- Type: Guardrail
- Summary: A public phase card is not fully done until it is fixed or completed, completion-review approved, and visibly reacted with the configured success reaction on the starter post.
- Rule: Do not advance to the next phase until the previous public phase card shows the resolved success reaction (`fawxzzy:1507384062166302851`).
- Pattern: status fixed/completed -> completion review approved -> starter post success reaction -> next phase may start.
- Failure Mode: Starting the next phase before the previous card visibly closes weakens board trust and makes shipped scope look incomplete.
- Status: Proposed

## 2026-05-18 - Completed Fitness feedback cards need post-completion review
- Type: Guardrail
- Summary: Fitness app cards marked Fixed or Completed should enter a post-completion review queue so shipped work is checked against card acceptance criteria before being treated as fully closed.
- Rule: Completion Review is required after Fitness app work is marked done.
- Rule: Ready for Fawxzzy Review is optional before work starts.
- Pattern: implementation shipped -> card fixed/completed -> completion review queue -> approved or follow-up.
- Failure Mode: Marking cards complete without post-completion review lets partial fixes look done and weakens the feedback-to-Codex loop.
- Status: Proposed

## 2026-05-18 - Discord message content access should stay explicit and scoped
- Type: Guardrail
- Summary: Fawx Security can now read message bodies, but that access should only be used for documented ops lanes, moderation, support, collaborator workflows, and explicit workflow capture.
- Rule: Message content access is scoped operational capability, not broad invisible surveillance.
- Rule: Administrator permissions and `MESSAGE_CONTENT` visibility are different controls and should be diagnosed separately.
- Pattern: documented channel or workflow -> bot reads relevant messages -> creates cleaned summary, moderation action, or workflow spec -> stores reviewed output.
- Failure Mode: using message content broadly without a documented lane makes the bot feel invasive and creates trust risk.
- Evidence: ATLAS docs/PLAYBOOK_NOTES.md, docs/ops/FITNESS-DISCORD-VERIFICATION.md

## 2026-05-18 - Spotify Club should coordinate Spotify-native playback, not stream audio
- Type: Guardrail
- Summary: Spotify Club links users and coordinates Jam Lobby state through Discord, but playback stays inside Spotify on each user's own account/device.
- Rule: Fawx Security must not stream, rebroadcast, record, or pipe Spotify audio through Discord.
- Pattern: Spotify OAuth -> Premium check -> Jam Ready -> future lobby/queue/sync.
- Failure Mode: Treating the bot as an audio source creates platform and licensing risk.
- Status: Proposed

## 2026-05-18 - Discord community features should hide setup commands and surface public actions as panels
- Type: Pattern
- Summary: Setup, moderation, and admin configuration commands should stay staff-facing, while normal-user Discord product flows should be delivered through persistent panels, buttons, and modals.
- Rule: `/setup-*` commands are admin-only.
- Rule: Moderation and staff control commands are staff-only.
- Rule: Public user workflows should not depend on memorizing slash commands.
- Rule: Slash commands are acceptable for early proof phases, but should not remain the main public UX.
- Pattern: admin setup slash command -> persistent public panel -> user buttons/modals -> bounded workflow state.
- Failure Mode: Keeping community features slash-command-first hides them from normal users and makes adoption depend on command memorization.
- Evidence: docs/ops/FITNESS-DISCORD-SPOTIFY-CLUB.md, Feedback panel, Verify panel
- Status: Proposed

## 2026-05-18 - Spotify Club should move from proof commands to public panels
- Type: Pattern
- Summary: Spotify Club Phase 2 should expose user actions through a public panel while keeping setup and lobby controls staff-facing.
- Rule: Admin/setup commands configure systems; buttons are the public product.
- Pattern: setup command -> persistent Spotify Club panel -> Connect/Status/Disconnect buttons -> lobby state.
- Failure Mode: Leaving Spotify Club as slash commands keeps the community feature hidden and underused.
- Status: Proposed

## 2026-05-18 - Spotify Club queue should be Discord-side before playback control
- Type: Guardrail
- Summary: Spotify Club should prove queue suggestions and host approval as Discord and Supabase state before mutating Spotify playback queues.
- Rule: Queue approval is not playback control.
- Pattern: suggest track -> pending queue item -> host approval -> panel queue preview -> later playback integration.
- Failure Mode: Pushing directly into Spotify playback queues before queue governance is stable creates noisy playback and API risk.
- Status: Proposed

## 2026-05-19 - Discord forum boards should stay visually clean while exports own planning order
- Type: Pattern
- Summary: Discord forum tags, titles, and a small amount of pinning make the public board readable, but the exported board and reviewed task packets remain the real sorted planning view.
- Rule: Forum order is visual only; export order is planning truth.
- Rule: `Backlog` is a planning tag for reviewed public cards that are not started yet.
- Rule: Do not churn thread activity just to fake custom sorting.
- Pattern: tags and title prefixes -> readable forum board -> board export -> reviewed task packets.
- Failure Mode: relying on Discord forum order alone makes the board feel messy because custom multi-layer sorting is not native there.
- Status: Proposed

## 2026-05-19 - Completed public feedback cards should show visible resolved state
- Type: Guardrail
- Summary: Public feedback cards that are fixed or completed should visibly look done in Discord, while exports and completion review still own the real workflow truth.
- Rule: Fixed or completed public cards should carry the configured success reaction on the starter post.
- Rule: Private testing canaries stay excluded from resolved-reaction hygiene by default.
- Pattern: status update -> completion review as required -> resolved reaction sync -> historical board card.
- Failure Mode: Finished public cards without a visible resolved marker make the forum look stale even when the stored status is correct.
- Status: Proposed

## 2026-05-19 - Spotify Club public channel should be panel-first and low-noise
- Type: Guardrail
- Summary: Spotify Club queue and lobby state should live in the public panel, while rollout tests and proof logs stay private.
- Rule: Public channel state belongs in the canonical panel.
- Rule: Test and proof chatter belongs in private testing channels.
- Pattern: user action -> ephemeral confirmation -> panel update -> private proof log when needed.
- Failure Mode: Public queue audit spam makes Spotify Club feel like an ops log instead of a community feature.
- Status: Proposed

## 2026-05-19 - Spotify Club playback handoff must be user-requested and Spotify-native
- Type: Guardrail
- Summary: Spotify Club may request playback only on a user's own active Spotify device after Premium, playback-scope, and device checks pass.
- Rule: Do not auto-start playback or stream Spotify audio through Discord.
- Rule: Playback readiness is not a promise of perfect sync.
- Rule: Once the Spotify Club panel exists, `/spotify` and `/jam-queue` should stay staff or operator fallback commands instead of public UX.
- Pattern: Premium check -> playback scope -> active device -> user-requested playback handoff.
- Failure Mode: Promising broadcast or perfect sync creates platform risk and brittle UX when Spotify devices are unavailable.
- Status: Proposed

## 2026-05-19 - Spotify Club rooms separate jam membership from Spotify authorization
- Type: Pattern
- Summary: Spotify Club should model room membership separately from Spotify account authorization so users can join or leave jams without deleting their saved Spotify connection.
- Rule: Leave Jam is not Disconnect Spotify Auth.
- Rule: The default public room should stay panel-first and low-noise.
- Pattern: connect Spotify -> join room -> search or suggest tracks -> leave room -> keep auth unless explicitly disconnected.
- Failure Mode: Treating disconnect as leaving the jam makes the product confusing and destroys useful saved auth state.
- Status: Proposed

## 2026-05-19 - Spotify Club should use one public status panel and a personalized ephemeral control hub
- Type: Pattern
- Summary: Spotify Club works better as one shared public status panel with a single controls launcher, while personalized state-aware actions live in one ephemeral control hub per user.
- Rule: The public `#spotify-club` panel is room status, not a wall of action buttons.
- Rule: Connect, join, leave, search, queue, readiness, and handoff actions should live in the ephemeral control hub.
- Rule: Hub actions should refresh or replace the same ephemeral response where practical instead of stacking many separate ephemeral messages.
- Pattern: public panel -> `Open Spotify Club Controls` -> personalized ephemeral hub -> compact confirmations -> panel refresh only when shared room state changes.
- Failure Mode: A public multi-button panel plus many separate ephemeral action messages makes Spotify Club feel noisy even when the public channel itself stays technically clean.
- Status: Proposed

## 2026-05-20 - Spotify Club mirror is visibility, not room queue authority
- Type: Guardrail
- Summary: Spotify Club should separate Discord-owned Room Queue state from Spotify's native Up Next mirror so generated Spotify tracks do not overpower user-managed room intent.
- Rule: Spotify mirror is a visibility layer. Room Queue is the user-managed product queue.
- Rule: No new Spotify Club phase starts until the previous public phase has live verification recorded and either a `#updates` post or an explicit failed-live-test follow-up card.
- Pattern: Previous / Current / Next / Room Queue / Spotify Up Next / Recent stay separate in data, UI copy, and queue counts.
- Failure Mode: Counting Spotify native Up Next as Room Queue makes generated Spotify tracks overpower Discord/user intent.
- Failure Mode: Every button click creating a new ephemeral message makes the control hub feel broken even when the public channel stays clean.
- Evidence: docs/ops/FITNESS-DISCORD-SPOTIFY-CLUB.md, Phase 7 stabilization feedback card
- Status: Proposed

## 2026-05-17 - Feedback-to-Codex should require reviewed task packets
- Type: Guardrail
- Summary: Discord feedback can generate implementation packets, but Codex work should begin only after a human-reviewed task packet approves the scope.
- Rule: Feedback cards are signals, not automatic implementation authority.
- Pattern: Feedback board export -> reviewed task packet -> Codex draft prompt -> human approval -> implementation -> feedback status update.
- Failure Mode: Running Codex directly from raw forum cards creates noisy sprint churn and duplicate task truth.
- Evidence: scripts/generate-feedback-task-packets.mjs, scripts/generate-feedback-task-packets.test.mjs, docs/ops/FITNESS-FEEDBACK-REVIEWED-TASKS.md
- Status: Proposed

## 2026-05-17 - Feedback cards should use story-card structure
- Type: Pattern
- Summary: Discord Feedback cards should be structured like lightweight story cards with user-facing Acceptance Criteria so they can drive reviewed planning without becoming raw engineering tickets.
- Rule: Feedback cards should be professional and structured, but still user-facing.
- Pattern: feedback row -> type-aware story card -> reviewed task packet -> Codex prompt.
- Failure Mode: Raw unstructured feedback makes triage harder; overly technical cards make the community board feel unfriendly.
- Evidence: src/lib/discord/bug-reports.ts, scripts/export-feedback-board.mjs, scripts/generate-feedback-task-packets.mjs
- Status: Proposed

## 2026-05-17 - Discord release posts and feedback audit comments must stay separate
- Type: Guardrail
- Summary: Public `#updates` announcements and local feedback-thread audit comments serve different audiences and should never be collapsed into one message type.
- Rule: Release posts announce shipped user-facing changes in `#updates`.
- Rule: Feedback audit comments stay inside the card thread and document card history.
- Rule: Do not post every feedback mutation to `#updates`.
- Pattern: card mutation -> compact thread audit comment; production release or approved shipped-card promotion -> curated updates-channel post.
- Failure Mode: Posting every card update to `#updates` creates noise, while silent card edits make the board hard to trust.
- Status: Proposed

## 2026-05-17 - Discord noise control should use permissions and mentions, not fake mute claims
- Type: Guardrail
- Summary: Fawx Security can inventory server ids and enforce low-noise posting rules, but personal channel mute state remains a user-side Discord preference.
- Rule: Only `Updates` and `Main` are loud channels.
- Rule: Non-update workflows must avoid broad pings.
- Pattern: server inventory -> noise audit -> conservative apply recommendations -> reviewed permission changes.
- Failure Mode: claiming the bot can mute channels for users creates false expectations and hides the real permission model.
- Evidence: scripts/discord-server-inventory.mjs, scripts/discord-noise-audit.mjs, scripts/discord-noise-apply.mjs, src/lib/discord/server-inventory.ts
- Status: Proposed

## 2026-05-17 - Shipped feedback cards need a distinct updates-channel promotion format
- Type: Pattern
- Summary: When a specific Discord feedback card ships and should be announced publicly, the updates-channel post should use a short `Update:` card-promotion format instead of the broad `@everyone` release-summary template.
- Rule: Thread audit comments stay in the feedback thread and remain compact.
- Rule: Card-promotion posts belong in `#updates` and should end with `Report ID: <short id>`.
- Rule: Do not reuse the public card-promotion format as a thread audit comment.
- Rule: One shipped card gets one public update post, not both a card-promotion post and a broad release-summary post.
- Pattern: shipped feedback card -> compact thread audit comment -> separate updates-channel `Update:` post -> report id footer.
- Failure Mode: Using the broad release-summary template for a single shipped card creates duplicate or mismatched public updates.
- Status: Proposed

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

## 2026-05-16 - Feedback launcher should be separate from the forum board
- Type: Pattern
- Summary: Discord feedback intake should begin in a small dedicated launcher channel, while the forum remains the visible board for created cards and audit history.
- Rule: Keep the public launcher surface limited to `Submit Feedback` and `Edit My Feedback`.
- Rule: Withdraw should live inside the scoped edit/manage flow, not as a top-level public launcher button.
- Pattern: launcher channel -> scoped card picker -> edit or withdraw -> forum card sync + audit comment.
- Failure Mode: Putting a large control post inside the forum mixes intake UX with board-reading UX and makes card management noisier than necessary.
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
- Summary: Fawx Security moderation should use logged notices and warnings first, then reversible Purgatory isolation when needed, rather than defaulting to bans.
- Rule: No full bans by default.
- Rule: Every moderation action needs a case record and release path.
- Pattern: notice/warning -> logged case -> Purgatory if needed -> release/restore.
- Failure Mode: Silent bans or destructive moderation actions create drama and make recovery harder.
- Status: Proposed

## 2026-05-17 - Verify channels should be locked bot-owned access panels
- Type: Guardrail
- Summary: Discord verification channels should contain one clean bot-owned access panel, not manual notes, user messages, or support threads.
- Rule: `#verify` is for access, not discussion.
- Pattern: locked channel -> Fawx Security verify/rules panel -> verification button -> role grant.
- Failure Mode: Letting users create messages or threads in `#verify` turns access setup into clutter and makes the server feel unpolished.
- Status: Proposed

## 2026-06-05 - Logged session exercise lanes should reuse the progression scroll-box shell
- Type: Pattern
- WHAT changed: The history/logged-session detail route now wraps the lower exercise-card lane in the same bounded glass scroll-box treatment used by progression measurement panels, sizes that viewport from a stable wrapper in normal page flow, keeps the sticky shell pinned above the bottom action dock, swaps the expanded state to a focused exercise overview card that reuses the exercise-info metric grid styling for session-specific stats, and folds exercise notes into that same overview card instead of a separate footer lane.
- WHY it changed: Logged session cards needed the same footer-safe, bounded scrolling behavior already proven on progression measurement input screens, but measuring the already-overflow-managed sticky shell after hydration could make the outer box keep shrinking itself upward until only a thin strip remained or let the lower shell drift behind the bottom dock instead of keeping the scroll inside the box. Expanded exercise mode also needed a cleaner information hierarchy, because leaving notes in a separate footer strip kept fighting the scroll-box sizing and split exercise-specific context across two disconnected surfaces.
- Rule: When a lower content lane needs its own footer-safe scrolling, reuse the established progression scroll-box shell before inventing a route-local container.
- Pattern: sticky summary or metrics card -> dock-pinned bounded glass scroll box -> internal exercise-card or set-list scrolling above the bottom dock.
- Failure Mode: Letting logged-session cards scroll on the raw page background makes the lower section feel structurally disconnected from the rest of the app and weakens footer-safe affordance.
- Evidence: `src/app/history/[sessionId]/LogAuditClient.tsx`
- Status: Proposed

## 2026-06-05 - History detail must keep every logged exercise even when sets or legacy ownership rows are sparse
- Type: Guardrail
- WHAT changed: The history detail route now keeps zero-set logged exercises visible in the client instead of filtering them out, and the detail loader now prefers the fuller relaxed `session_exercises` and `sets` result set when strict `user_id` filters only return a partial legacy subset.
- WHY it changed: Some completed sessions were showing more exercises in the history list than in the detail page because the detail client hid logged exercises with no sets and the loader could silently undercount legacy rows when only some child records still carried `user_id`, which also corrupted the detail metrics derived from that reduced set.
- Rule: A completed history detail page must render the same logged exercise inventory the session summary was built from, even when an exercise has zero sets or some legacy child rows only survive the session-id query path.
- Pattern: load strict history detail rows -> compare with relaxed session-id rows -> keep the fuller bounded result -> render every logged exercise card -> let empty-set exercises show an empty measurement state instead of disappearing.
- Failure Mode: Dropping zero-set or partially legacy exercises from detail makes the exercise count disagree with History, removes cards the user actually logged, and poisons recap or metric totals built from the reduced list.
- Evidence: `src/app/history/[sessionId]/LogAuditClient.tsx`, `src/lib/history-session-detail-loader.ts`, `src/lib/history-session-detail-loader.test.ts`
- Status: Proposed

## 2026-06-05 - Progression analytics should be summarized once and reused across history-family surfaces
- Type: Pattern
- WHAT changed: Session history cards, exercise history cards, the exercise info sheet, logged-session exercise focus, and the account storage snapshot now all consume one shared progression lifeline summary built from `progression_events`, exposing promotion counts, target lifelines, latest target changes, and progressed-exercise rollups without each route inventing its own wording or counting rules.
- WHY it changed: The app already stored progression events, but most history-family surfaces only showed performance metrics or readiness state, which made promotion history feel invisible and forced users to mentally reconstruct target changes from raw workouts instead of seeing a clean "started here -> moved here -> latest change" story.
- Rule: When a surface needs promotion or target-evolution analytics, derive them from a shared progression-event summary layer before adding route-local counters or copy.
- Pattern: load scoped progression events -> build shared session or exercise lifeline summary -> feed cards, detail panels, and account storage metrics from that same summary.
- Failure Mode: Recomputing promotion analytics separately on each screen creates drift in counts, wording, and target labels, and makes account/export summaries disagree with history or exercise detail surfaces.
- Evidence: `src/lib/progression-lifeline-summary.ts`, `src/lib/history-sessions-page-loader.ts`, `src/lib/exercises-browser.ts`, `src/lib/exercise-info.ts`, `src/app/history/[sessionId]/page.tsx`
- Status: Proposed

## 2026-06-05 - Metric cards should render from one shared surface grid instead of screen-local copies
- Type: Pattern
- WHAT changed: History session cards, history exercise cards, history detail exercise cards, weekly and thirty-day history summaries, workout detail rows, exercise-surface grids, and the account storage snapshot now all render their compact detailed metrics through one shared `SurfaceMetricGrid` primitive in `src/components/ui/MetricItem.tsx`.
- WHY it changed: The app had multiple nearly identical metric-grid implementations with slightly different label tones, spacing, accent bars, and value handling, which kept reintroducing visual drift any time one screen was tuned without the others.
- Rule: When a screen needs the canonical compact metric-card treatment, start from the shared `SurfaceMetricGrid` before adding route-local metric markup.
- Pattern: shared metric datum contract -> shared compact metric surface grid -> screen-specific metric selection only.
- Failure Mode: Copying metric-card markup into individual screens guarantees recurring theme drift, spacing regressions, and mismatched metric affordances between collapsed, expanded, history, and account surfaces.
- Evidence: `src/components/ui/MetricItem.tsx`, `src/components/history/HistorySessionCard.tsx`, `src/components/history/HistoryExerciseCard.tsx`, `src/components/history/HistoryDetailExerciseCard.tsx`, `src/components/history/WeeklyProgressSurface.tsx`, `src/components/history/ThirtyDayHistorySurface.tsx`, `src/components/settings/DataSettingsSection.tsx`
- Status: Proposed

## 2026-06-05 - Core exercise cards should use a full-height, accent-safe media rail
- Type: Pattern
- WHAT changed: Core exercise-card surfaces now share one wider `96px` media rail, the rail itself keeps a small left inset so the accent strip stays visible, row-card exercise art no longer gets extra contain padding that shrinks it away from the top and bottom edges, history cards no longer override that rail back into a centered square inset, and detailed history cards now let the lower-right image stretch square to the full lower-section height instead of pinning it to a fixed box.
- WHY it changed: History compact cards had drifted into visibly undersized exercise art, and inconsistent per-surface rail widths made the same exercise-card family feel unrelated across Today, history, current-session, and edit-day surfaces. The added inset preserves the accent strip without forcing history-only wrapper hacks.
- Rule: If an exercise card is part of the core row-card family, its image should fill the rail vertically and derive width from the shared surface policy instead of a surface-local square inset treatment.
- Pattern: shared row-card shell -> shared `96px` rail -> accent-safe left inset -> top-to-bottom exercise art, and if a detailed history card uses a lower-right image block, that block anchors to the bottom-right corner below the chevron lane and reserves its square footprint before the text column claims the remaining width.
- Failure Mode: Inset square media treatments make history cards feel smaller than the rest of the app, waste left-side card space, and cause repeated one-off fixes whenever image scale changes.
- Evidence: `src/components/ExerciseCard.tsx`, `src/components/exercises/ExerciseThumb.tsx`, `src/components/history/HistoryExerciseCard.tsx`, `src/lib/workout-card-surface-policy.ts`
- Status: Proposed

## 2026-06-05 - Disclosure chevrons should share one state wrapper
- Type: Pattern
- WHAT changed: Repeated expanded/collapsed chevron branches now flow through one shared `StateChevron` wrapper instead of each surface hand-picking `ChevronRightIcon` versus `ChevronDownIcon`.
- WHY it changed: Today rows, history detail rows, routine-day cards, workout disclosure rows, settings accordions, and progression review panels had started duplicating the same direction-switch logic with small color and spacing drift.
- Rule: If a surface is just expressing collapsed-versus-expanded chevron state, use the shared wrapper and pass local styling through classes instead of re-implementing icon selection inline.
- Pattern: shared `StateChevron` direction logic -> surface-local size/color classes -> only special-purpose arrows keep bespoke logic.
- Failure Mode: Hand-written chevron ternaries drift in direction, tone, and alignment and make disclosure interactions harder to normalize across page families.
- Evidence: `src/components/ui/StateChevron.tsx`, `src/components/workout/ExerciseDisclosureCard.tsx`, `src/components/history/HistoryDetailExerciseCard.tsx`, `src/app/today/TodayExerciseRows.tsx`, `src/app/today/TodayDayPicker.tsx`
- Status: Proposed

## 2026-06-05 - Detail recap sections should share one bullet-list renderer across history and exercise info
- Type: Pattern
- WHAT changed: History session detail cards and the exercise info `Progress` and `Progression` panels now render recap bullets through one shared detailed-section renderer instead of each screen carrying its own bullet spacing, divider, and wrap logic.
- WHY it changed: Exercise info had drifted into a softer local recap style while history cards had already locked in the more stable section rhythm, so copy, spacing, and wrapped bullet behavior kept diverging even when the screens were supposed to feel like the same metric-card family.
- Rule: If a detail surface needs the canonical bullet recap treatment under a metric grid, use the shared detailed-section renderer before adding route-local bullet markup.
- Pattern: shared thin divider -> shared uppercase section title -> shared wrap-safe two-column bullet list -> screen-specific section selection only.
- Failure Mode: Rebuilding recap bullets per screen reintroduces text-touching-dot bugs, spacing drift, and inconsistent progress/progression panels across exercise info, history, and logged-session detail.
- Evidence: `src/components/ui/DetailSectionList.tsx`, `src/components/history/HistorySessionCard.tsx`, `src/components/ExerciseInfoSheet.tsx`
- Status: Proposed

## 2026-07-14 - History calendars distinguish completed and skipped planned workout days
- Type: Pattern
- WHAT changed: The history calendar now derives past planned workout dates from routine cycle truth, keeps completed session days green, marks genuinely missed workout days red, and allows vertical page movement to begin over the horizontally swipeable month rail. Deterministic mobile fixtures remain blocked in production but can be opened on protected Vercel preview deployments for operator review.
- WHY it changed: The calendar previously showed only completed-session density and its horizontal-only touch contract blocked normal mobile page scrolling when a gesture started inside the calendar.
- Rule: Calendar status must come from routine scheduling plus completed-session truth, and horizontally scrollable history surfaces must preserve vertical page gestures.
- Evidence: `src/lib/history-planned-days.ts`, `src/lib/history-calendar.ts`, `src/components/history/HistoryCalendarSurface.tsx`

## 2026-07-17 - Migration source recovery must preserve immutable provenance and parity uncertainty
- Type: Guardrail
- WHAT changed: Three missing Fitness migration sources were restored as exact Git blobs from an immutable historical commit and locked by raw SHA-256 plus a complete source-tree manifest; provider-returned canonical statements remain a separate evidence class.
- WHY it changed: Live migration history had 101 versions while `origin/main` had 98 sources, and provider-canonical text cannot prove the original applied bytes for every statement or justify rewriting substantive mismatches.
- Rule: Never silently rewrite historical migration bytes to match provider-returned text; require immutable provenance, explicit uncertainty, and a faithful replay or separately governed ledger-repair path before changing applied migration truth.
- Pattern: freeze source/live denominators -> recover exact historical blobs -> verify raw and tree manifests -> classify canonical/whitespace/raw parity separately -> route unresolved content mismatches to a bounded successor.
- Failure Mode: Treating provider-canonical or whitespace-normalized equality as raw-byte proof creates false parity, hides source drift, and makes migration history irreproducible.
- Decision: Keep raw parity `UNKNOWN` where the provider cannot prove applied bytes, and do not let source recovery absorb unrelated application changes or unresolved content repair.
- Evidence: `supabase/migrations/20260713013116_exercise_timer_truth.sql`, `supabase/migrations/20260713020801_set_timing_truth.sql`, `supabase/migrations/20260716033653_routine_day_optional.sql`, `scripts/migration/fp-fit-rec-001-verify.mjs`, `docs/ops/FP-FIT-REC-001-SOURCE-RECOVERY-RECEIPT.md`
- Status: Proposed

## 2026-07-18 - Server admin credentials need one modern-first resolution boundary
- Type: Guardrail
- WHAT changed: Fitness server runtime credential selection now lives in the server-only Supabase admin module, prefers `SUPABASE_SECRET_KEY`, and retains `SUPABASE_SERVICE_ROLE_KEY` only as a temporary rollback fallback for the staged security migration.
- WHY it changed: Runtime guards and health checks were coupled directly to the legacy variable name, so installing an independently revocable Supabase secret key would still make valid admin flows appear unavailable or continue selecting the historically exposed legacy credential.
- Rule: Backend Supabase credentials must resolve through one server-only boundary; blank preferred values may fall back, missing total input fails with sanitized configuration text, and no value metadata may enter diagnostics or browser code.
- Pattern: modern server secret -> bounded legacy rollback fallback -> stable fail-closed configuration error -> source-neutral readiness checks.
- Failure Mode: Scattered environment-name checks can select different credentials, leak source details through diagnostics, or falsely treat source compatibility as proof that the legacy credential is deactivated.
- Decision: Keep the legacy fallback until Preview and separately approved Production verification prove the modern key across every consumer; scripts, browser publishable keys, provider mutation, deployments, and deactivation remain separate governed packets.
- Evidence: `src/lib/supabase/admin.ts`, `src/lib/env.test.ts`, `src/app/auth/actions.ts`, `src/lib/atlas-contracts.ts`, `src/lib/discord/message-command-claims.ts`
- Status: Proposed

## 2026-07-19 - CI contract evidence must preserve explicit targets and local ownership
- Type: Guardrail
- WHAT changed: Atlas health classification now treats an explicit Vercel Preview or Production target as authoritative even when CI is also set, and the Fitness metrics evidence pack plus its Atlas/Codex context runbook now use maintained repository-local ownership evidence.
- WHY it changed: Ambient CI incorrectly masked explicit deployment-target evidence in contract tests, while stale Atlas-root paths made an otherwise local Fitness evidence pack unverifiable from this repository.
- Rule: CI is a fallback environment classification, not an override for an explicit deployment target; source evidence referenced by Fitness runbooks and packs must be retrievable from the Fitness repository or be replaced with a maintained local ownership contract.
- Pattern: explicit Vercel target -> environment classification -> CI fallback, and frozen metrics-pack reference -> local runbook -> maintained Fitness adoption contract.
- Failure Mode: Letting ambient CI override target evidence misclassifies Preview or Production contracts, while cross-repository documentation paths leave local operators unable to validate the asserted ownership boundary.
- Evidence: `src/lib/atlas-contracts.ts`, `src/lib/atlas-contracts.test.ts`, `docs/ops/ATLAS-CODEX-CONTEXT-RUNBOOK.md`, `docs/ops/FITNESS-ATLAS-CONTRACT-ADOPTION.md`, `src/lib/ecosystem/fitness-metrics-pack.test.ts`
- Status: Proposed

## 2026-07-17 - Member numbers are immutable and never reused
- Type: Decision
- WHAT changed: Fitness source numbering now retires delete-driven compaction, ignores caller-supplied human identity values on insert, rejects member-identity changes after creation, and removes client authority to reset the source sequence.
- WHY it changed: Compact public slots rewrote surviving human identities after deletion, while profile grants and the assignment function still left alternate renumbering paths. Removing only the delete trigger would not make the identity contract true.
- Rule: Human `user_number`, `user_kind`, and `user_number_assigned_at` are immutable after assignment; deleted numbers leave permanent gaps and are never reused.
- Rule: Automation profiles remain unnumbered, and new human numbers come only from the source allocator until the governed target cutover activates exactly one replacement allocator.
- Pattern: fail-closed catalog and high-water preconditions -> retire compaction with `RESTRICT` -> harden insert assignment -> enforce immutable updates -> revoke sequence mutation authority -> prove survivor mapping and concurrent allocation in disposable replay.
- Failure Mode: Treating member numbers as dense display slots destroys stable identity, makes Discord snapshots drift, and lets deletion or client-supplied values renumber existing users.
- Decision: Never recreate compaction as rollback and never hard-code a target sequence floor; calculate the floor from freeze-time source and target high-water evidence.
- Evidence: `supabase/migrations/20260718015422_retire_human_member_number_compaction.sql`, `scripts/member-number-safety-core.mjs`, `scripts/migration/fp-fit-user-number-safety-verify.mjs`, `docs/ops/FP-FIT-USER-NUMBER-SAFETY-001.md`
- Status: Proposed

## 2026-07-27 - Visual QA needs one source-bound state registry
- Type: Decision
- WHAT changed: Fitness visual QA now derives signed-in fixture, public, auth/loading, and curated-onboarding captures from one permanent registry with an accepted 111-state and 313-capture denominator. The same registry feeds runner suites, source-bound manifests, deterministic family boards, a mega-board, and hashed receipts.
- WHY it changed: The prior screenshot catalog proved useful coverage but its route lists and generated evidence were temporary. Rebuilding route inventories independently would let states disappear, redirects pass unnoticed, and review boards drift away from the source head that produced them.
- Rule: A visual state is added or changed in the shared registry first; capture runners and board builders consume that contract rather than maintaining route lists of their own.
- Pattern: immutable source commit/tree + registry digest + pinned browser environment -> deterministic capture plan -> requested/resolved route proof -> per-capture receipt -> family and mega boards -> hash receipt.
- Failure Mode: Temporary catalogs become stale evidence, silent count reductions hide lost states, and board-only review cannot prove which source, fixture, route, or browser environment produced an image.
- Decision: Keep screenshot baselines and large boards in governed runtime or CI artifact storage. Commit only a content-addressed baseline manifest when baseline comparison is separately admitted; never commit generated images as an automatic visual update.
- Decision: Visual-QA foundation work inventories and proves product states but does not redesign product UI, alter fixture-driven production behavior, approve a baseline, or authorize deployment.
- Evidence: `scripts/qa/visual-fitness-state-registry.mjs`, `scripts/qa/visual-fitness-runner.mjs`, `scripts/build-mobile-regression-boards.py`, `docs/mobile-regression-fixtures.md`
- Status: Proposed

## 2026-07-27 - Merge reconciliation is proven by reviewed-tree identity
- Type: Guardrail
- WHAT changed: The visual-QA wave starts only after the merged source commit is read back with the reviewed feature head as its second parent and a merge tree byte-identical to the reviewed tree.
- WHY it changed: Starting follow-on QA from a branch label or PR state alone can capture a stale or conflict-resolved tree that differs from the reviewed source.
- Rule: Before registering or capturing a post-merge visual denominator, prove the new main commit, ordered parentage, reviewed-head ancestry, and reviewed-tree identity.
- Failure Mode: A visually plausible catalog can certify the wrong source state if merge reconciliation is inferred from metadata rather than Git objects.
- Evidence: `docs/mobile-regression-fixtures.md`, `scripts/qa/visual-fitness-runner.mjs`
- Status: Proposed

## 2026-07-28 - Raw onboarding answers compile into a semantic planning contract
- Type: Decision
- WHAT changed: Curated onboarding now has a source-only, versioned normalization boundary with deterministic issues, parallel provenance, a semantic generation projection, portable canonical hashing, ten golden normalized fixtures, closed runtime validation with digest recomputation, and required exact-head CI coverage. Production generation and persistence remain unchanged.
- WHY it changed: Directly reading raw question IDs in a generator couples planning to UI shape, makes hidden or malformed answers unsafe, and lets unordered or presentation-only data destabilize deterministic identity.
- Rule: Hard constraints never participate in weighted scoring or caller-controlled reclassification, unknown safety state is not equivalent to unrestricted, unknown schedule mode cannot retain a known day count, and callers cannot downgrade issue severity, forge response paths, or conceal warning/professional-direction blockers behind a recomputed digest.
- Pattern: Compile raw intake into a versioned planning contract, then hash the semantic generation projection rather than raw responses.
- Failure Mode: Volatile fields, raw answer ordering, hidden state, or provenance in a generation digest can produce different identities for the same planning meaning.
- Decision: Keep nutrition, delivery preferences, acknowledgments, and historical lift context outside exercise selection; preserve them as context or provenance.
- Evidence: `src/features/curated-onboarding/planning/contract.ts`, `src/features/curated-onboarding/planning/normalize.ts`, `src/features/curated-onboarding/planning/normalize.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-28 - Planning normalization must fail closed without throwing
- Type: Guardrail
- WHAT changed: The planning normalizer now sanitizes malformed multi-select members, deduplicates after identifier canonicalization, treats free-form pain text as unresolved scope, and parses equipment load values without mistaking pair counts for weight.
- WHY it changed: A blocked intake is still an executable boundary result; malformed or ambiguous source data must not crash normalization or silently create the wrong hard constraint.
- Rule: Record invalid source shape, discard unsafe members, and return a schema-valid blocked contract. Never infer movement restrictions from free-form pain wording alone.
- Pattern: validate raw shape -> sanitize runtime values -> normalize semantic identity -> validate the emitted contract.
- Failure Mode: Keyword inference, pre-canonical deduplication, and first-number parsing can turn ambiguous safety or equipment text into authoritative planner constraints.
- Evidence: `src/features/curated-onboarding/planning/normalize.ts`, `src/features/curated-onboarding/planning/normalize.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed
