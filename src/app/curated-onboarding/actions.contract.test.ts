import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionsSource = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const routinesSource = readFileSync(new URL("../routines/actions.ts", import.meta.url), "utf8");

function exportedActionBodies() {
  const pieces = actionsSource.split(/^export async function /m).slice(1);
  return pieces.map((piece) => ({ name: piece.slice(0, piece.indexOf("(")), body: piece }));
}

test("every exported curated server action enforces the feature flag before auth, database or generator work", () => {
  const actions = exportedActionBodies();
  assert.deepEqual(
    actions.map((action) => action.name).sort(),
    ["createCuratedRoutineDraftAction", "generateCuratedWorkoutPlanAction"],
  );

  for (const { name, body } of actions) {
    const gate = body.indexOf("isCuratedOnboardingEnabled()");
    assert.ok(gate >= 0, `${name} must call isCuratedOnboardingEnabled()`);
    for (const work of ["requireUser(", "supabaseServer(", "compileCuratedWorkoutGeneration(", "createCuratedRoutineDraft("]) {
      const at = body.indexOf(work);
      if (at >= 0) assert.ok(gate < at, `${name}: the flag check must precede ${work}`);
    }
    assert.match(body, /code: "feature-disabled"/, name);
  }
});

test("server actions rethrow redirects and never return raw exception or database text to the member", () => {
  assert.equal((actionsSource.match(/isRedirectError\(error\)/g) ?? []).length, 2);
  assert.match(actionsSource, /isRedirectError\(error\)\) \{\s+throw error;/);
  assert.doesNotMatch(actionsSource, /error: error instanceof Error \? error\.message/);
  assert.doesNotMatch(actionsSource, /return \{ ok: false, error: \w+\.message/);
  assert.doesNotMatch(actionsSource, /error: \w*Error\.message \}/);
  assert.doesNotMatch(actionsSource, /Curated exercise catalog is missing/);
});

test("a failed create removes the exact routine row and reports a failed cleanup instead of ignoring it", () => {
  assert.match(actionsSource, /const \{ error \} = await supabase\.from\("routines"\)\.delete\(\)/);
  assert.match(actionsSource, /CURATED_CREATE_PARTIAL_MESSAGE/);
  const createBody = routinesSource.slice(
    routinesSource.indexOf("export async function createRoutineAction"),
    routinesSource.indexOf("export async function updateRoutineAction"),
  );
  assert.ok((createBody.match(/routineId: routine\.id \}/g) ?? []).length >= 3);
});
