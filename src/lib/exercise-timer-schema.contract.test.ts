import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("exercise timer schema admits the disabled paused state used by the session action", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/20260713013116_exercise_timer_truth.sql", import.meta.url),
    "utf8",
  );
  const sessionActions = readFileSync(new URL("../app/session/[id]/actions.ts", import.meta.url), "utf8");

  assert.match(migration, /not exercise_timer_enabled\s+and exercise_timer_status in \('idle', 'paused'\)/);
  assert.doesNotMatch(migration, /not exercise_timer_enabled and exercise_timer_status = 'idle'/);
  assert.match(sessionActions, /shouldDisableTimer \? \{ \.\.\.timer, enabled: false \} : timer/);
});
