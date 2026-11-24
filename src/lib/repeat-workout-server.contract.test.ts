import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("repeat workout reuses Today's start path and never writes to the finished session", () => {
  const server = read("src/lib/repeat-workout-server.ts");
  assert.match(server, /startSessionForRoutineDay,/, "the real start path from Today is wired in");
  assert.match(server, /import \{ startSessionForRoutineDay \} from "@\/lib\/start-session"/);

  const runner = read("src/lib/repeat-workout-loaders.ts");
  assert.match(runner, /ports\.startSessionForRoutineDay\(\{ routineId: plan\.routineId, dayId: plan\.dayId \}\)/, "the new session comes from the shared start path");
  for (const source of [server, runner]) {
    assert.doesNotMatch(source, /\.(insert|update|upsert|delete)\(/, "read-only loaders: no table writes here");
    assert.doesNotMatch(source, /target_(sets|reps|weight)/, "no goal numbers are copied from the old session");
  }
});

test("every repeat loader maps a Supabase error to a failure instead of reading it as an empty result", () => {
  const runner = read("src/lib/repeat-workout-loaders.ts");
  assert.doesNotMatch(runner, /const \{ data[^}]*\} = await supabase/, "no loader may destructure data and drop the error");
  assert.match(runner, /function orFail/);
});

test("the repeat route is a session JSON API: an expired session answers 401 JSON instead of a redirect", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /SESSION_JSON_API_PATHS = \[[^\]]*"\/api\/sessions\/repeat"/);
  const route = read("src/app/api/sessions/repeat/route.ts");
  assert.match(route, /handleRepeatWorkoutRequest/);
  assert.match(route, /repeatWorkoutFromSession/);
  const handler = read("src/lib/repeat-workout-route-handler.ts");
  assert.match(handler, /withSessionExpiredJson/);
});

test("History detail wires the repeat card from the session row and the active routine, outside edit mode", () => {
  const page = read("src/app/history/[sessionId]/page.tsx");
  assert.match(page, /repeatWorkout=\{getRepeatWorkoutAvailability\(sessionRow, profile\.active_routine_id\)\}/);
  const client = read("src/app/history/[sessionId]/LogAuditClient.tsx");
  assert.match(client, /!isEditing && !expandedExercise && repeatWorkout \?/);
  assert.match(client, /<RepeatWorkoutCard/);
});
