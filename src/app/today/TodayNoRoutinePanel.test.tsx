import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { ToastProvider } from "../../components/ui/ToastProvider.tsx";
import { formatTodayAllRoutinesLink, TodayNoRoutinePanel } from "./TodayNoRoutinePanel";

// PR #324 review (P1): Today offers starter plans only on a true first run. People with routines pick one of theirs;
// all-archived adds "Restore a routine"; anything unknown is the plain Routines card. Starters never replace silently.

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

function render(node: ReactElement) {
  return renderMarkup(
    <AppRouterContext.Provider value={router}>
      <ToastProvider>{node}</ToastProvider>
    </AppRouterContext.Provider>,
  );
}

const readSource = (fileName: string) => readFileSync(new URL(fileName, import.meta.url), "utf8");

test("first run: the three starter plans with Build my own and Your routines", () => {
  const html = render(<TodayNoRoutinePanel state={{ kind: "starters" }} />);
  assert.match(html, /Pick a plan to start/);
  assert.equal((html.match(/data-starter-plan="/g) ?? []).length, 3);
  assert.match(html, />Build my own</);
  assert.match(html, />Your routines</);
  assert.doesNotMatch(html, /Restore a routine/);
});

test("every routine archived: plans plus Restore a routine (the Archived list on Routines)", () => {
  const html = render(<TodayNoRoutinePanel state={{ kind: "starters-with-restore" }} />);
  assert.match(html, /Pick a plan to start/);
  assert.match(html, /Your routines are archived\. Restore one, or pick a plan/);
  assert.match(html, /<a(?=[^>]*href="\/routines")(?=[^>]*data-starter-restore-link="true")[^>]*>Restore a routine<\/a>/);
  assert.match(html, />Build my own</);
});

test("routines but none active: the person's own routines, one tap each, and no starter plans", () => {
  const html = render(
    <TodayNoRoutinePanel
      state={{ kind: "pick-routine", routines: [{ id: "r-1", name: "Upper / lower" }, { id: "r-2", name: "Home" }], moreCount: 3 }}
      chooseAction={async () => ({ ok: true })}
    />,
  );
  assert.match(html, /Pick a routine for Today/);
  assert.match(html, /aria-label="Use Upper \/ lower on Today"/);
  assert.match(html, /aria-label="Use Home on Today"/);
  assert.match(html, /See all 5 routines/);
  assert.doesNotMatch(html, /data-starter-plan|Pick a plan to start/, "nothing new can be created from here");

  assert.equal(formatTodayAllRoutinesLink(2, 0), "All routines");
  assert.equal(formatTodayAllRoutinesLink(3, 2), "See all 5 routines");
});

test("unknown or no routines left after workouts: the plain Choose a routine card, never plans", () => {
  for (const state of [{ kind: "choose" } as const, null]) {
    const html = render(<TodayNoRoutinePanel state={state} />);
    assert.match(html, /Choose a routine/);
    assert.match(html, /<a[^>]*href="\/routines"[^>]*>Go to Routines<\/a>/);
    assert.doesNotMatch(html, /data-starter-plan/);
  }
});

test("Today reads the no-routine state on the server and the shell renders the panel, not plans by default", () => {
  const page = readSource("./page.tsx");
  assert.match(page, /if \(!activeRoutine && !fetchFailed\) \{\s+try \{\s+noRoutineState = await loadTodayNoRoutineState\(supabase, user\.id\);/);
  assert.match(page, /noRoutineState = \{ kind: "choose" \};/, "a failed read falls back to the plain card");
  assert.match(page, /<TodayClientShell userId=\{user\.id\} payload=\{todayPayload\} fetchFailed=\{fetchFailed\} noRoutineState=\{noRoutineState\} \/>/);

  const shell = readSource("./TodayClientShell.tsx");
  assert.match(shell, /<TodayNoRoutinePanel state=\{noRoutineState\} \/>/);
  assert.match(shell, /noRoutineState = null,/);
  assert.doesNotMatch(shell, /<StarterPlanCard/);
});

test("choosing a routine on Today refuses while a workout is open or the routine is archived", () => {
  const action = readSource("./choose-routine-action.ts");
  assert.match(action, /^"use server";/);
  assert.match(action, /if \(hasOpenWorkout\) return \{ ok: false, error: CHOOSE_WORKOUT_OPEN_MESSAGE \};/);
  assert.match(action, /if \(hasOpenWorkout === null\) return \{ ok: false, error: CHOOSE_FAILED_MESSAGE \};/);
  assert.match(action, /if \(!routine \|\| isRoutineArchived\(routine\)\) return \{ ok: false, error: CHOOSE_UNAVAILABLE_MESSAGE \};/);
  assert.match(action, /await setActiveRoutineAction\(formData\)/, "tier check and write stay in the shared action");
});

test("starter plans never replace an active routine or move the pointer under an open workout", () => {
  const actions = readSource("../routines/starter-actions.ts");
  assert.doesNotMatch(actions, /async function activate\(/, "no unconditional activation helper is left");
  assert.equal((actions.match(/setActiveRoutineAction\(/g) ?? []).length, 1, "one write site, inside activateIfAllowed");
  assert.match(actions, /resolveStarterActivation\(await readStarterActivationInput\(supabase, userId, routineId\)\)/);
  assert.match(actions, /if \(decision\.kind === "add-only"\) \{\s+return \{ ok: true, activated: false, notice: describeStarterAddOnly\(decision\.reason\) \};/);
  assert.match(actions, /const replayId = await findReplayableStarterRoutineId\(supabase, user\.id, template\);\s+if \(replayId\) \{\s+return await adopt\(replayId, "replay"\);/, "a replay follows the same rule");

  const client = readSource("../routines/CreateRoutineClient.tsx");
  assert.match(client, /onCreated=\{\(\{ activated \}\) => router\.push\(activated \? "\/today" : "\/routines"\)\}/);

  const card = readSource("./StarterPlanCard.tsx");
  assert.match(card, /if \(!result\.activated && result\.notice\) \{\s+toast\.success\(result\.notice, \{ id: STARTER_TOAST_ID \}\);/);
  assert.match(card, /onCreated=\{\(\{ activated \}\) => \(activated \? router\.refresh\(\) : router\.push\("\/routines"\)\)\}/);
});

test("a rollback clears a pointer it left behind, and a racing duplicate removes itself and adopts the winner", () => {
  const actions = readSource("../routines/starter-actions.ts");
  assert.match(actions, /async function rollbackCreatedRoutine\(created: CreatedRoutine\) \{[\s\S]*?clearActiveRoutineIfMatches\(created\.supabase, created\.userId, created\.routineId\)[\s\S]*?return await deleteRoutine\(/);
  assert.match(actions, /const cleanedUp = created\.routineId \? await rollbackCreatedRoutine\(created\) : true;/, "the catch path clears the pointer too");
  assert.match(actions, /if \(created\.routineId && !\(await rollbackCreatedRoutine\(created\)\)\) \{/, "so does every abort");
  assert.match(actions, /const raceWinnerId = await findStarterRaceWinner\(supabase, user\.id, template\.name\);\s+if \(raceWinnerId && raceWinnerId !== routineId\) \{/);
  assert.ok(
    actions.indexOf("findStarterRaceWinner(supabase") < actions.indexOf("for (const [offset, planDay] of template.week.entries())"),
    "the race is settled before any day or exercise work",
  );
});
