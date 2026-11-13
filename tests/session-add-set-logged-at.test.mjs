import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Drives the real addSetAction / syncQueuedSetLogsAction with only their external boundaries substituted (Supabase,
// auth, revalidation) and asserts the logged_at that reaches the sets insert. Guards FF-SESSION-005: an offline
// replay must be stamped with the member's tap time, not the server's replay time.
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function transpile(file) {
  return ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const sandboxGlobals = {
  process: { env: { NODE_ENV: "test" } },
  console: { log() {}, error() {}, warn() {} },
  Date, Promise, Object, Array, Number, String, Math, JSON, Error, Set, Map, RegExp, Symbol,
};

function loadPure(file) {
  const exports = {};
  runInNewContext(transpile(file), { exports, require() { throw new Error("unexpected import"); }, ...sandboxGlobals }, { filename: file });
  return exports;
}

const setLoggedAt = loadPure("src/lib/set-logged-at.ts");

/** Records every sets insert; every other query resolves empty so ensurePerformedIndex returns early. */
function createSupabaseStub(inserts) {
  const emptyResult = { data: null, error: null };
  function chain(table) {
    const node = new Proxy(function () {}, {
      get(_target, property) {
        if (property === "then") {
          return (resolve) => resolve(emptyResult);
        }
        if (property === "insert") {
          return (payload) => {
            if (table === "sets") {
              inserts.push(payload);
            }
            const inserted = { ...payload, id: "server-" + inserts.length };
            return { select: () => ({ single: async () => ({ data: inserted, error: null }) }) };
          };
        }
        if (property === "maybeSingle" || property === "single") {
          return async () => emptyResult;
        }
        return () => node;
      },
    });
    return node;
  }
  return { from: (table) => chain(table) };
}

function loadActions(inserts) {
  const noop = new Proxy({}, { get: () => () => undefined });
  const known = {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth": { requireUser: async () => ({ id: "user-1" }) },
    "@/lib/supabase/server": { supabaseServer: () => createSupabaseStub(inserts) },
    "@/lib/session-live-mutation": {
      guardLiveSessionMutation: async () => ({ ok: true }),
      parseLiveSessionStatus: () => "live",
    },
    "@/lib/set-logged-at": setLoggedAt,
  };
  const file = "src/app/session/[id]/actions.ts";
  const exports = {};
  runInNewContext(transpile(file), {
    exports,
    require: (name) => (Object.hasOwn(known, name) ? known[name] : noop),
    ...sandboxGlobals,
  }, { filename: file });
  return exports;
}

const basePayload = {
  sessionId: "session-1",
  sessionExerciseId: "exercise-1",
  weight: 135,
  reps: 5,
  durationSeconds: null,
  distance: null,
  distanceUnit: null,
  calories: null,
  isWarmup: false,
  notes: null,
  weightUnit: "lbs",
};

test("addSetAction stamps a plausible client instant (offline replay) and returns it", async () => {
  const inserts = [];
  const { addSetAction } = loadActions(inserts);
  const tapped = new Date(Date.now() - 8 * 60 * 1000).toISOString();

  const result = await addSetAction({ ...basePayload, clientLogId: "log-1", loggedAt: tapped });

  assert.equal(result.ok, true);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].logged_at, tapped);
  assert.equal(result.data.set.logged_at, tapped);
});

test("addSetAction falls back to the server clock for missing, zone-less, stale or future instants", async () => {
  const candidates = [
    undefined,
    "2026-11-13T11:52:30",
    "yesterday",
    new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    new Date(Date.now() + 3600 * 1000).toISOString(),
  ];
  for (const loggedAt of candidates) {
    const inserts = [];
    const { addSetAction } = loadActions(inserts);
    const before = Date.now();
    await addSetAction({ ...basePayload, loggedAt });
    const after = Date.now();
    const stamped = Date.parse(inserts[0].logged_at);
    assert.ok(stamped >= before && stamped <= after, "server clock expected for " + String(loggedAt));
  }
});

test("syncQueuedSetLogsAction forwards each queue item's createdAt so a replayed queue keeps its real spacing", async () => {
  const inserts = [];
  const { syncQueuedSetLogsAction } = loadActions(inserts);
  const base = Date.now() - 20 * 60 * 1000;
  const taps = [0, 90, 185].map((seconds) => new Date(base + seconds * 1000).toISOString());

  const result = await syncQueuedSetLogsAction({
    items: taps.map((createdAt, index) => ({
      id: "queue-" + index,
      clientLogId: "log-" + index,
      sessionId: "session-1",
      sessionExerciseId: "exercise-1",
      createdAt,
      payload: {
        weight: 135, reps: 5, durationSeconds: null, distance: null, distanceUnit: null,
        calories: null, isWarmup: false, notes: null, weightUnit: "lbs",
      },
    })),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data.results.map((entry) => entry.ok), [true, true, true]);
  assert.deepEqual(inserts.map((payload) => payload.logged_at).sort(), [...taps].sort());
});
