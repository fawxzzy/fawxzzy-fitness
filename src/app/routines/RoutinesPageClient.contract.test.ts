import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("RoutinesPageClient keeps /routines as the browse list screen", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /RoutineHomeClient/);
  assert.doesNotMatch(source, /\bactiveRoutineId\b/);
  assert.doesNotMatch(source, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(source, /createPortal/);
  assert.match(source, /New Routine/);
  assert.match(source, /curatedOnboardingEnabled/);
  assert.match(source, /curatedOnboardingUserId/);
});

test("RoutinesPageClient renders routine cards on the card system: actions behind the more control, no corner Delete", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.match(source, /<RoutineBrowseCard/);
  assert.match(source, /onActionsToggle=/);
  assert.match(source, /buildRoutineCardActions\(\{/);
  const builder = readFileSync(new URL("../../components/routines/routineCardActions.ts", import.meta.url), "utf8");
  assert.match(builder, /key: "delete"/);
  assert.match(builder, /key: "set-active"/);
  assert.match(source, /<CardEmptyState/);
  assert.doesNotMatch(source, /routine-card-delete|ROUTINE_CARD_DELETE|AttachedCardActionStripFrame|INACTIVE_ROUTINE_CARD_CLASS_NAME/);
});
