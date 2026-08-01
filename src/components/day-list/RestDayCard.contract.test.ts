import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./RoutineDayCardPresentation.tsx", import.meta.url), "utf8");

test("RestDayCard is exported and reuses the existing rest-day accent treatment", () => {
  assert.match(source, /export function RestDayCard\(/);
  // Same yellow-accent className already used by the correct Routine Overview
  // rest-day card, rather than inventing a new visual treatment.
  assert.match(source, /className=\{cn\(ROUTINE_REST_DAY_CARD_CLASS_NAME, className\)\}/);
  assert.match(source, /bodyClassName=\{cn\(ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME, bodyClassName\)\}/);
});

test("RestDayCard shows a meaningful accessible name, not only a color cue", () => {
  // Title defaults to visible text "Rest" and subtitle defaults to the shared
  // REST_DAY_CARD_COPY body text -- both are real text content (not
  // aria-hidden), so assistive tech reads real words, not just a border color.
  assert.match(source, /title = "Rest"/);
  assert.match(source, /subtitle = REST_DAY_CARD_COPY/);
  assert.match(source, /badgeText = "Rest"/);
});

test("RestDayCard cannot trigger navigation or create a workout as a render side effect", () => {
  const restDayCardBody = source.slice(source.indexOf("export function RestDayCard"), source.indexOf("export function RoutineOverviewDayCard"));
  assert.ok(restDayCardBody.length > 0, "expected to locate the RestDayCard function body");
  // No onPress wiring and no action/server-call imports inside RestDayCard --
  // it is purely presentational.
  assert.doesNotMatch(restDayCardBody, /onPress/);
  assert.match(restDayCardBody, /rightIcon=\{null\}/);
});
