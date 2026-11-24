import assert from "node:assert/strict";
import test from "node:test";
import { SESSION_EXPIRED_API_BODY } from "./api-auth-redirect.ts";
import { REPEAT_WORKOUT_FAILED_MESSAGE, REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE } from "./repeat-workout.ts";
import { createRepeatWorkoutDeps, runRepeatWorkout, type RepeatWorkoutPorts } from "./repeat-workout-loaders.ts";
import { handleRepeatWorkoutRequest } from "./repeat-workout-route-handler.ts";

type Query = { table: string; filters: Record<string, unknown>; selected: string };
type Reply = { data: unknown; error: unknown };

// Names every query the repeat flow makes, so a test can fail exactly one of them.
function queryName(q: Query): string {
  switch (q.table) {
    case "sessions":
      return "id" in q.filters ? "source" : "in_progress";
    case "profiles":
      return "active";
    case "routines":
      return "routine";
    case "session_exercises":
      return "session_exercises";
    case "routine_day_exercises":
      return "planned";
    case "routine_days":
      if ("day_index" in q.filters) return "day_at_index";
      return Array.isArray(q.filters.id) ? "live_days" : "day_by_id";
    default:
      return q.table;
  }
}

const HAPPY: Record<string, unknown> = {
  source: { id: "s-old", status: "completed", routine_id: "r1", routine_day_index: 2 },
  active: { active_routine_id: "r1" },
  in_progress: null,
  routine: { id: "r1" },
  session_exercises: [{ routine_day_exercise_id: "e1" }],
  planned: [{ id: "e1", routine_day_id: "d2" }],
  live_days: [{ id: "d2" }],
  day_by_id: { id: "d2", day_index: 2 },
  day_at_index: { id: "d-pos", day_index: 2 },
};

/** A chainable stand-in for the Supabase query builder: records filters, answers `{ data, error }` per query. */
function fakeSupabase(options: { data?: Record<string, unknown>; errors?: string[]; seen?: string[] } = {}) {
  const data = { ...HAPPY, ...options.data };
  const errors = new Set(options.errors ?? []);
  const client = {
    from(table: string) {
      const q: Query = { table, filters: {}, selected: "" };
      const reply = (): Reply => {
        const name = queryName(q);
        options.seen?.push(name);
        return errors.has(name) ? { data: null, error: { message: "boom" } } : { data: data[name] ?? null, error: null };
      };
      const builder: Record<string, unknown> = {
        select(columns: string) {
          q.selected = columns;
          return builder;
        },
        eq(key: string, value: unknown) {
          q.filters[key] = value;
          return builder;
        },
        in(key: string, value: unknown) {
          q.filters[key] = value;
          return builder;
        },
        not() {
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: async () => reply(),
        then(resolve: (value: Reply) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve(reply()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return client as never;
}

function makePorts(overrides: Partial<RepeatWorkoutPorts> & { supabase?: ReturnType<typeof fakeSupabase>; started?: unknown[] } = {}): RepeatWorkoutPorts {
  const started = overrides.started ?? [];
  return {
    requireUser: overrides.requireUser ?? (async () => ({ id: "u1" })),
    getSupabase: overrides.getSupabase ?? (async () => overrides.supabase ?? fakeSupabase()),
    startSessionForRoutineDay:
      overrides.startSessionForRoutineDay ??
      (async (payload) => {
        started.push(payload);
        return { ok: true, data: { sessionId: "s-new" } };
      }),
  };
}

test("happy path: the day found through the exercises is started through the shared start path, as a new session", async () => {
  const started: unknown[] = [];
  const result = await runRepeatWorkout(makePorts({ started }), "s-old");
  assert.deepEqual(result, { ok: true, data: { sessionId: "s-new", resumed: false } });
  assert.deepEqual(started, [{ routineId: "r1", dayId: "d2" }]);
});

test("an error on ANY loader is the failure message and never starts a workout", async () => {
  const names = ["source", "active", "in_progress", "routine", "session_exercises", "planned", "live_days", "day_by_id"];
  for (const name of names) {
    const started: unknown[] = [];
    const result = await runRepeatWorkout(makePorts({ started, supabase: fakeSupabase({ errors: [name] }) }), "s-old");
    assert.deepEqual(result, { ok: false, error: REPEAT_WORKOUT_FAILED_MESSAGE }, `error on ${name}`);
    assert.equal(started.length, 0, `nothing started after an error on ${name}`);
  }

  // The position lookup is only reached when no exercise links back to a day.
  const started: unknown[] = [];
  const atIndex = await runRepeatWorkout(
    makePorts({ started, supabase: fakeSupabase({ data: { session_exercises: [] }, errors: ["day_at_index"] }) }),
    "s-old",
  );
  assert.deepEqual(atIndex, { ok: false, error: REPEAT_WORKOUT_FAILED_MESSAGE });
  assert.equal(started.length, 0);
});

test("a failed in-progress lookup does NOT mean none is in progress: no second workout is created", async () => {
  const started: unknown[] = [];
  const seen: string[] = [];
  const result = await runRepeatWorkout(makePorts({ started, supabase: fakeSupabase({ errors: ["in_progress"], seen }) }), "s-old");
  assert.equal(result.ok, false);
  assert.equal(started.length, 0);
  assert.ok(!seen.includes("routine"), "the flow stops at the failed lookup");
});

test("each loader reads with the user scope and without writing", async () => {
  const deps = createRepeatWorkoutDeps(fakeSupabase(), "u1");
  assert.equal((await deps.loadSourceSession("s-old"))?.status, "completed");
  assert.equal(await deps.loadActiveRoutineId(), "r1");
  assert.equal(await deps.loadInProgressSessionId(), null);
  assert.equal(await deps.routineExists("r1"), true);
  assert.deepEqual(await deps.loadLinkedDayIds("s-old", "r1"), ["d2"]);
  assert.deepEqual(await deps.loadDayById("r1", "d2"), { id: "d2", day_index: 2 });
  assert.deepEqual(await deps.loadDayAtIndex("r1", 2), { id: "d-pos", day_index: 2 });
});

test("a session from an inactive routine is refused on the server and nothing is started", async () => {
  const started: unknown[] = [];
  const result = await runRepeatWorkout(
    makePorts({ started, supabase: fakeSupabase({ data: { active: { active_routine_id: "r-other" } } }) }),
    "s-old",
  );
  assert.deepEqual(result, { ok: false, error: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE });
  assert.equal(started.length, 0);

  const noneActive = await runRepeatWorkout(makePorts({ started, supabase: fakeSupabase({ data: { active: { active_routine_id: null } } }) }), "s-old");
  assert.deepEqual(noneActive, { ok: false, error: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE });
  assert.equal(started.length, 0);
});

test("a workout already in progress is opened with the resumed notice and nothing is started", async () => {
  const started: unknown[] = [];
  const result = await runRepeatWorkout(makePorts({ started, supabase: fakeSupabase({ data: { in_progress: { id: "s-live" } } }) }), "s-old");
  assert.deepEqual(result, { ok: true, data: { sessionId: "s-live", resumed: true } });
  assert.equal(started.length, 0);
});

test("outcome 'existing' from the start RPC returns resumed: true so the already-in-progress notice shows", async () => {
  const result = await runRepeatWorkout(
    makePorts({ startSessionForRoutineDay: async () => ({ ok: true, data: { sessionId: "s-live", existing: true } }) }),
    "s-old",
  );
  assert.deepEqual(result, { ok: true, data: { sessionId: "s-live", resumed: true } });
});

test("a start failure keeps its own message, and a start with no id is the failure message", async () => {
  const failed = await runRepeatWorkout(makePorts({ startSessionForRoutineDay: async () => ({ ok: false, error: "That day is a rest day." }) }), "s-old");
  assert.deepEqual(failed, { ok: false, error: "That day is a rest day." });
  const noId = await runRepeatWorkout(makePorts({ startSessionForRoutineDay: async () => ({ ok: true, data: { sessionId: "" } }) }), "s-old");
  assert.deepEqual(noId, { ok: false, error: REPEAT_WORKOUT_FAILED_MESSAGE });
});

function post(body: unknown) {
  return new Request("http://localhost/api/sessions/repeat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("route: a missing sign-in answers 401 session-expired JSON, not a redirect and not a 500", async () => {
  const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
  const ports = makePorts({ requireUser: async () => Promise.reject(redirect) });
  const response = await handleRepeatWorkoutRequest(post({ sessionId: "s-old" }), (id) => runRepeatWorkout(ports, id));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("location"), null);
  assert.deepEqual(await response.json(), SESSION_EXPIRED_API_BODY);
});

test("route: 200 with the result for a started workout, 400 with the message for a refusal, 400 for a bad payload", async () => {
  const ok = await handleRepeatWorkoutRequest(post({ sessionId: " s-old " }), (id) => runRepeatWorkout(makePorts(), id));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { ok: true, data: { sessionId: "s-new", resumed: false } });

  const inactive = makePorts({ supabase: fakeSupabase({ data: { active: { active_routine_id: "r-other" } } }) });
  const refused = await handleRepeatWorkoutRequest(post({ sessionId: "s-old" }), (id) => runRepeatWorkout(inactive, id));
  assert.equal(refused.status, 400);
  assert.deepEqual(await refused.json(), { ok: false, error: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE });

  const failing = makePorts({ supabase: fakeSupabase({ errors: ["in_progress"] }) });
  const failed = await handleRepeatWorkoutRequest(post({ sessionId: "s-old" }), (id) => runRepeatWorkout(failing, id));
  assert.equal(failed.status, 400);
  assert.deepEqual(await failed.json(), { ok: false, error: REPEAT_WORKOUT_FAILED_MESSAGE });

  assert.equal((await handleRepeatWorkoutRequest(post("not json"), async () => ({ ok: true, data: { sessionId: "x", resumed: false } }))).status, 400);
  assert.equal((await handleRepeatWorkoutRequest(post({}), async () => ({ ok: true, data: { sessionId: "x", resumed: false } }))).status, 400);
});
