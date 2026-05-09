# Roadmap

This is the canonical product roadmap for Fawxzzy Fitness. After Wave 1, Fitness is no longer just a workout logger. It is becoming a curated workout engine that should tell the user what to train today, what target to hit, why that target exists, how close they are to the next update, what changed, and what patterns are emerging from stored workout truth.

## Product Doctrine

- Fitness is a deterministic fitness and workout tracking product first. New work must preserve deterministic progression, tracking, and review behavior.
- Fitness remains the reference lane. Shared shells, shared components, and repo-owned product truth take priority over route-local exceptions.
- The stable shell remains Today, Routines, History, and Account. New value should compound inside that shell rather than add new top-level product structure.
- Today should explain the current training decision. Routines should own planned workout truth. Current Session should stay fast and reliable. History and progression surfaces should explain what changed from stored workout evidence.
- Rule: Rep range guidance and promotion logic are separate concepts.
- Rule: Progression Method decides when. Progression Vector decides what. Progression Step decides how much.
- Rule: Every production push/version gets a release ledger entry.
- Failure Mode: Do not let status/debug surfaces leak back into normal Today/Routines Progression Updates.
- Pattern: ATLAS coordinates operator prompt-packs; repos own implementation truth.

## Current Product Direction

- The near-term product is a curated workout engine, not a generic wellness planner and not a passive logging app.
- Progression must stay inspectable. The user should be able to trace a target, promotion, hold, deload, or revert back to completed workout truth.
- Custom exercise and preset work should extend the current picker, taxonomy, and shared confirmation seams instead of creating parallel route families.
- QA, export, release, and operator workflows are part of product trust. They are not separate from roadmap quality.

## Wave 1 / MVP Foundation Completed

- Recovered and stabilized the canonical Fitness shell across auth, Today, Routines, Session, History, and Account/Settings.
- Re-established the deterministic architecture contract around Next.js, TypeScript, Tailwind, Supabase, RLS, and server-owned protected writes.
- Improved the active logger with inline prior-truth context, repeat-last-set behavior, and PR feedback while preserving the fast logging loop.
- Shipped the first deterministic progression foundation:
  - inspectable progression methods and regression-policy separation
  - Training Focus seeding without hidden rewrites of existing exercise truth
  - measurement-aware progression step policy
  - cardio progression vectors for time, distance, and time-plus-distance targets
  - Set Flow model/default seams and advisory planned targets
  - Today review seams for explicit apply/revert behavior instead of silent target mutation
- Added progression audit, scenario, and LLEL support so progression behavior can be reviewed against deterministic fixtures instead of memory.
- Established Wave 1 trust lanes:
  - QA/LLEL data hygiene and authenticated review rules
  - account export hygiene with truth-first export formats
  - release ledger ownership in `docs/releases/`
  - repo-owned ATLAS contract adoption without moving implementation truth out of the repo
- Preserved custom exercise creation inside existing picker seams and confirmed that user-owned exercise rows must not silently mutate the global catalog.

## Beta / Active Next Work

1. Curated guidance surfaces
   - Add a header or marquee info rail that explains today's training decision, the active target, why it matters, and how close the user is to the next update.
   - Ship a dedicated Progression Status surface for non-ready states, linked reasoning, and explanatory detail.
   - Keep Today and Routines Progression Updates focused on actionable Ready Updates only.

2. Progression evidence and pattern visibility
   - Add a progression analytics or event-ledger surface that records applied, reverted, held, promoted, and deloaded target decisions.
   - Explain what changed since the last relevant session or cycle and surface emerging patterns without inventing black-box coaching.
   - Make progress-fill and progression-summary visuals derive from the same evidence used by progression review.

3. Current Session execution quality
   - Turn Set Flow planned targets into reliable live session targets where they help execution without mutating logged truth.
   - Run a Current Session reliability regression pass before adding more logger complexity.
   - Preserve the fast logging loop and keep noisy status/reason copy out of the main logger surface.

4. Progression model and preset polish
   - Finish multi-metric cardio and vector progression polish so cardio targets are first-class, not strength copy with different units.
   - Add presets by exercise and equipment type where they improve deterministic defaults without hiding executable exercise-level truth.
   - Clarify rep and weight promotion controls so review surfaces explain exactly what will change and why.

5. Exercise curation, QA, and operator trust
   - Finish custom exercise taxonomy work and visual smoke coverage.
   - Upgrade QA/LLEL screenshot, video, and report workflows so regression review is easier to audit.
   - Integrate release ledger recording more tightly into the deploy workflow.
   - Improve account export so it remains import-friendly, audit-friendly, and consistent with product truth.

## V1 Commit Criteria

- A user can open Today and understand what to do, what target to hit, why that target is current, and how close they are to the next update without visiting a dev or audit route.
- A user can complete a session with reliable live targets, fast set entry, and no hidden routine-target mutation during logging.
- A user can review progression changes through explicit product surfaces, including what changed, why it changed, and how to revert or inspect the underlying evidence.
- Operators can verify releases, QA captures, exports, and progression behavior from durable repo-owned artifacts instead of chat memory.

## Post-v1 / Deferred Work

- Broader wellness-mode expansion remains deferred until the Fitness curated-engine loop is stable and trusted.
- Diet, Cycle, and other wellness lanes should reuse the same shell and deterministic product standards only after Fitness v1 is complete.
- Shareability, richer recap polish, and broader premium-insight packaging stay secondary to progression clarity and session reliability.
- Cross-domain analytics and recommendations remain deferred until each participating lane has trusted, deterministic data.

## Explicit Non-Goals

- No fifth top-level nav tab for new domains.
- No permanent expansion of the current four-slot shell.
- No black-box AI coach positioning or opaque recommendation engine.
- No status/debug leakage back into normal Today or Routines Progression Updates.
- No live logging flow that silently mutates planned routine targets while the session is in progress.
- No custom exercise image uploads in the first custom exercise pass.
- No automatic promotion of user-created exercises into the global catalog.
- No social feed, follow graph, or sensor-first tracking push ahead of the curated workout engine.
- No repo-roadmap handoff to ATLAS root; ATLAS can coordinate operator surfaces, but this repo keeps implementation truth.
