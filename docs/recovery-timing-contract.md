# Observed rest (recovery timing) contract

Card: FF-SESSION-005. Code: `src/lib/recovery-timing.ts`, `src/lib/set-logged-at.ts`.

## What it is

"Observed rest" is a descriptive number: the median gap between consecutive working sets of one exercise. It is shown as `Observed rest m:ss` in the exercise card baseline (Current Session) and in History detail, and as `Typical rest m:ss` for a whole session in History (the median of each exercise's own observed rest, two or more exercises needed).

## Rules

1. Source: `sets.logged_at` only. The exercise timer (`session_exercises.exercise_timer_*`, FF-SESSION-001 to 004) is a different concern and is never read. Both numbers can sit on the same card; they are never added, averaged or relabelled into each other. Derived rest data carries `source: "between_set_intervals"` so any later analytics can keep the two apart.
2. Deterministic: instants only. No `Date.now()`, no wall-clock day, no time zone. A session that crosses local midnight, or is opened in another time zone, gives the same figure.
3. Explainable: warm-ups are left out (History carries `is_warmup` through the loader, page mapping and normalizer for this); gaps under 15 s or over 15 min are not rest and are dropped; fewer than two usable gaps gives nothing (no guess, no placeholder). The History summary names how many exercises it covers; this document is the full rule.
4. Descriptive only: no recommendation, no coaching, no medical or AI claim. A next-set countdown or "rest longer" prompt is deliberately not built: it would read as a rest timer, which FF-SESSION-005 keeps separate. Owner review (docs/ops/FITNESS-REVIEW-QUEUE.md) moved observed rest into the exercise card baseline, so the older `RecoveryTimingPrompt` aside stays unwired.
5. Offline-safe: a set logged offline is stamped with the member's tap time (the queue item's `createdAt`, taken at the tap even when the request only failed later) when the server replays it (`resolveSetLoggedAt`: strict ISO-8601 with a zone, at most 40 characters, within 72 h in the past and not more than 2 min ahead of the server, otherwise the server clock). Without this a whole queue replayed on reconnect lands within milliseconds and the real rest is lost. The client also stamps `logged_at` on optimistic and restored queued sets, so the label works before the set reaches the server.
6. No database change: `sets.logged_at` already exists (`supabase/migrations/20260713020801_set_timing_truth.sql`). Where the column is missing the code already falls back and rest simply does not show.
