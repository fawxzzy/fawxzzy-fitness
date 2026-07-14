# FF-SESSION Exercise Timer Card Drafts

Date:
- 2026-07-09

Scope:
- Local board-draft packet only.
- Does not mutate the live Discord board.

Purpose:
- Add a truthful, non-overlapping card set for per-exercise exercise timers in Fawxzzy Fitness.
- Keep the toggleable exercise timer separate from any later recovery or rest recommendation layer.

## Current card review

### FF-CORE-001 - Complete Progression Engine V2

Decision:
- Keep open card as-is.

Reason:
- The existing scope is about deterministic target logic, progression review, and explainable next-target behavior.
- Per-exercise exercise timers are session-execution UX and duration telemetry, not progression-engine authority.

Suggested clarification if this card is ever reformatted:
- Do not broaden `FF-CORE-001` to include exercise-timer UX, countdown controls, or recovery analytics.

### FF-COPILOT-001 - Session Copilot / Progression Bot Interface

Decision:
- Do not reopen this card for exercise timers.

Reason:
- The card is already resolved and its shipped slice is feedback/action/receipt contract work.
- Exercise timers would create scope drift by mixing timer-state UX with copilot explanations.

Suggested clarification if this card is ever reformatted:
- Session Copilot may reference completed timing or later recovery behavior, but it should not own timer controls, timer persistence, or timer analytics.

### FF-HISTORY-001 - Rebuild useful history metrics and progression analytics

Decision:
- Do not reopen this card.

Reason:
- The card already closed around usefulness-first history and progression analytics.
- Exercise-timer analytics should land through a new session-timer lane and then feed history surfaces as follow-on output.

### FF-RET-004 - Add Weekly and Monthly Progress Summaries

Decision:
- Keep card open, but do not imply recovery summaries before a separate recovery lane exists.

### FF-PWA-002 - Offline-Ready PWA + Persistent Session Restore

Decision:
- Keep resolved card closed.

Reason:
- Exercise-timer reliability should not silently reopen offline scope unless an explicit offline timer requirement is requested later.

## Proposed new card set

### FF-SESSION-001 - Add Per-Exercise Exercise Timer System

Title:
- Add Per-Exercise Exercise Timer System

User Story:
- As a user, I want to enable a timer for specific exercises so I can time myself during the exercise without leaving the current session.

Description:
- Add a deterministic per-exercise timer system to session logging for exercises the user wants to time while they are actively performing them.
- The timer belongs to the session exercise, not to the whole workout and not to a global-only preference.
- This lane stays separate from progression-engine authority, rest guidance, and copilot/chat behavior.

Acceptance Criteria:
- A session exercise can carry an optional exercise-timer setting.
- The timer is for timing the exercise itself, not for implicitly becoming a rest timer between sets.
- Timer completion creates deterministic session data that can be queried later.
- History and analytics can distinguish exercises with timer-backed duration behavior from exercises without it.

### FF-SESSION-002 - Add Exercise Timer Toggle When Adding an Exercise

Title:
- Add Exercise Timer Toggle When Adding an Exercise

User Story:
- As a user, I want to decide when I add an exercise whether that exercise should use a timer during logging.

Acceptance Criteria:
- Add Exercise exposes a switch such as `Exercise Timer`.
- When on, the user can choose or inherit a bounded timer configuration appropriate for the exercise.
- The control must not be framed as a rest-only feature.

### FF-SESSION-003 - Show Live Per-Exercise Timer During Current Session Logging

Title:
- Show Live Per-Exercise Timer During Current Session Logging

User Story:
- As a user, I want the enabled exercise timer to appear while I log sets so I can time the exercise itself inside the current session flow.

Acceptance Criteria:
- Timer-enabled exercises show an exercise-timer control in the current logger.
- The timer can be started, paused, resumed, or reset without leaving the logger.
- If the exercise has a target duration, completion visibly marks the timer as done for that exercise.
- Do not couple timer start or completion to an assumed rest countdown between sets.

### FF-SESSION-004 - Persist Exercise Timer Outcomes Into Session Analytics

Title:
- Persist Exercise Timer Outcomes Into Session Analytics

User Story:
- As a user, I want timer usage and completed exercise timing to be saved so the app can reflect how I actually trained.

Acceptance Criteria:
- Session exercise truth stores configured timer target or timer mode when present.
- Logged exercise-timer outcomes are stored in a bounded, queryable shape.
- Completed session reads can load timer-backed duration data.
- This card is about exercise timing truth, not about deriving rest prescriptions.

### FF-SESSION-005 - Add Separate Recovery And Rest Recommendation Layer

Title:
- Add Separate Recovery And Rest Recommendation Layer

User Story:
- As a user, I want any recovery or rest guidance to be a separate feature from the timer I use during the exercise itself.

Acceptance Criteria:
- History can summarize recovery or rest behavior without rewriting the scope of the exercise timer cards.
- Analytics can distinguish exercise timing data from recovery or rest recommendation data.
- This lane stays explicitly separate from FF-SESSION-001 through FF-SESSION-004.

## Recommended board notes

- Keep `FF-SESSION-001` as the umbrella card.
- Run `FF-SESSION-002` through `FF-SESSION-004` as the implementation cluster.
- Treat `FF-SESSION-005` as a separate recovery layer only after timer truth is real.
- Do not silently collapse exercise timing into rest guidance.

## Honest scope boundaries

Explicitly in scope:
- per-exercise timer enablement
- live timer UX in Current Session
- persisted timer truth
- deterministic timer-backed history/analytics reuse

Explicitly out of scope:
- redefining the exercise timer as a rest timer
- push notifications
- watch or sensor integrations
- AI coach language
- generic whole-workout timer mode
- social or community timer sharing
