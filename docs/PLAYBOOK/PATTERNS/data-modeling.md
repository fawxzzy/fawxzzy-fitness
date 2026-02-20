# Pattern: Routine Day Modeling + Timezone Resolution

## Problem
Need deterministic “what should I train today?” behavior for repeating routines across timezones.

## When to use
- Routine scheduling.
- Any feature depending on “today” in user local time.

## Implementation outline (repo-specific)
1. Store routine cycle metadata (`cycle_length_days`, `start_date`, `timezone`).
2. Compute current day index via `getRoutineDayComputation`.
3. Resolve current day row by `routine_id + day_index`.
4. Use `getTimeZoneDayWindow` for date-bounded queries (e.g., completed count).

## Gotchas
- Day-index logic relies on timezone-aware date normalization; avoid ad hoc `new Date()` comparisons.
- Profile timezone must exist before routine resolution; call `ensureProfile`.

## Evidence
- `src/lib/routines.ts`
- `src/lib/profile.ts`
- `src/app/today/page.tsx`
- `supabase/migrations/002_routines.sql`
