import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup as renderMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { TodayEmptyDayCard, TODAY_EMPTY_DAY_COPY } from "./TodayEmptyDayCard";
import { TodaySwitchDayList, type TodaySwitchDay } from "./TodaySwitchDayCard";
import { getRoutineDayEditHref, getRoutineEditHref, resolveRoutineEditBackHref } from "../../lib/routine-day-navigation.ts";

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {}, bfcacheId: "test" };

function render(node: ReactElement) {
  return renderMarkup(<AppRouterContext.Provider value={router}>{node}</AppRouterContext.Provider>);
}

function readSource(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

const exercises = (...names: string[]) => names.map((name) => ({ name }));
const DAYS: TodaySwitchDay[] = [
  { id: "d1", dayIndex: 1, name: "Push", isRest: false, exercises: exercises("Bench Press", "Dip", "Fly", "Push-Up", "Lateral Raise") },
  { id: "d2", dayIndex: 2, name: "Lower", isRest: false, exercises: exercises("Back Squat") },
  { id: "d3", dayIndex: 3, name: "", isRest: true, exercises: [] },
  { id: "d4", dayIndex: 4, name: "Travel Reset", isRest: false, exercises: [] },
];

function renderList(overrides: Partial<Parameters<typeof TodaySwitchDayList>[0]> = {}) {
  return render(
    <TodaySwitchDayList
      days={DAYS}
      startDate="2025-03-10"
      currentDayIndex={2}
      selectedDayIndex={2}
      completedDayIndexes={[1]}
      inSessionDayIndex={null}
      onSelectDay={() => {}}
      {...overrides}
    />,
  );
}

function cardHtml(html: string, dayIndex: number) {
  const marker = html.indexOf(`data-routine-day-card="${dayIndex}"`);
  assert.ok(marker >= 0, `card ${dayIndex} rendered`);
  const start = html.lastIndexOf("<li", marker);
  const next = html.indexOf("<li", marker);
  return html.slice(start, next < 0 ? undefined : next);
}

test("Switch Day: one ul of li cards; no chips, no tag row, no 'Selected'/'Rest' tag words, no plus sign", () => {
  const html = renderList();
  assert.match(html, /^<ul[^>]*>/);
  assert.equal((html.match(/<li class="min-w-0">/g) ?? []).length, DAYS.length);
  assert.doesNotMatch(html, /data-card-chip|data-card-status-chip|card-chip/);
  assert.doesNotMatch(html, />\s*(Selected|SELECTED|Rest|REST|Done ✓|✓)\s*</);
  assert.doesNotMatch(html, /\+/);
});

test("Switch Day training card: day name title, plain meta line, and a snapshot of the first three exercises", () => {
  const push = cardHtml(renderList(), 1);
  assert.match(push, /data-switch-day-card="training"/);
  assert.match(push, /<h2[^>]*>[^<]*Push/);
  assert.match(push, /Day 1/);
  assert.match(push, /5 exercises/);
  assert.match(push, /Done/);
  assert.match(push, /data-switch-day-snapshot="true"[^>]*>Bench Press, Dip, Fly<span[^>]*>, and 2 more<\/span><\/p>/);
});

test("Switch Day empty training day: 'No exercises' in the meta line and no snapshot paragraph", () => {
  const empty = cardHtml(renderList(), 4);
  assert.match(empty, /No exercises/);
  assert.doesNotMatch(empty, /data-switch-day-snapshot/);
});

test("Switch Day rest card: titled 'Rest day', one line (no meta row, no snapshot), amber tone unless selected", () => {
  const rest = cardHtml(renderList(), 3);
  assert.match(rest, /data-switch-day-card="rest"/);
  assert.match(rest, /<h2[^>]*>[\s\S]*?Rest day/);
  assert.match(rest, /Day 3 · Wed/);
  assert.doesNotMatch(rest, /data-switch-day-snapshot|data-card-meta/);
  assert.match(rest, /data-card-tone="attention"/);
  assert.match(cardHtml(renderList({ selectedDayIndex: 3 }), 3), /data-card-tone="current"/);
});

test("Switch Day selection: exactly one aria-pressed=true header button plus a visible check; today is text, not a tag", () => {
  const html = renderList({ currentDayIndex: 2, selectedDayIndex: 4 });
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, DAYS.length - 1);
  const selected = cardHtml(html, 4);
  assert.match(selected, /aria-pressed="true"/);
  assert.match(selected, /data-switch-day-selected-check="true"/);
  assert.match(selected, /data-card-tone="current"/);
  assert.equal((html.match(/data-switch-day-selected-check/g) ?? []).length, 1);
  assert.match(cardHtml(html, 2), /Today/);
  assert.doesNotMatch(cardHtml(html, 2), /data-switch-day-selected-check/);
});

test("Today empty states share one card: centred title, no second line, one action to the right editor", () => {
  const routineId = "routine-1";
  const dayHref = getRoutineDayEditHref(routineId, "day-9", "/today");
  const routineHref = getRoutineEditHref(routineId, "/today");
  assert.match(dayHref, /^\/routines\/routine-1\/edit\/day\/day-9\?returnTo=%2Ftoday$/);
  assert.equal(routineHref, "/routines/routine-1/edit?returnTo=%2Ftoday");
  assert.equal(getRoutineEditHref(routineId), "/routines/routine-1/edit", "no returnTo, plain editor href");
  assert.equal(getRoutineEditHref(routineId, "//evil.example"), "/routines/routine-1/edit", "unsafe returnTo is dropped");
  assert.equal(resolveRoutineEditBackHref(routineId, "/today"), "/today", "editor back returns to Today");
  assert.equal(resolveRoutineEditBackHref(routineId, "https://evil.example"), "/routines/routine-1", "unsafe returnTo falls back to routine home");
  assert.equal(resolveRoutineEditBackHref(routineId, null), "/routines/routine-1");

  const empty = render(<TodayEmptyDayCard kind="empty" actionHref={dayHref} />);
  const rest = render(<TodayEmptyDayCard kind="rest" actionHref={routineHref} />);
  const noSchedule = render(<TodayEmptyDayCard kind="noSchedule" actionHref={routineHref} />);

  for (const [html, kind] of [[empty, "empty"], [rest, "rest"], [noSchedule, "noSchedule"]] as const) {
    assert.match(html, new RegExp(`data-today-empty-day="${kind}"`));
    assert.match(html, /data-card-empty="true"/);
    assert.match(html, new RegExp(`<h2 class="[^"]*text-center[^"]*">${TODAY_EMPTY_DAY_COPY[kind].title}</h2>`));
    // No second line: the only text nodes are the title and (optionally) the action label.
    assert.doesNotMatch(html, /<p[\s>]/);
    assert.match(html, /aria-hidden="true" data-today-empty-mark=/);
  }

  const emptyAction = empty.match(/<a [^>]*>Edit day<\/a>/)?.[0] ?? "";
  assert.ok(emptyAction.includes(`href="${dayHref}"`), "Edit day opens the Edit Day editor and returns to Today");
  assert.ok(emptyAction.includes('data-today-empty-action="empty"'));
  assert.match(emptyAction, /app-button-secondary/);
  const routineAction = noSchedule.match(/<a [^>]*>Edit routine<\/a>/)?.[0] ?? "";
  assert.ok(routineAction.includes('href="/routines/routine-1/edit?returnTo=%2Ftoday"'), "Edit routine opens the routine editor and returns to Today");
  assert.ok(routineAction.includes('data-today-empty-action="noSchedule"'));
  assert.doesNotMatch(rest, /<a /, "rest day never offers an action");
  assert.doesNotMatch(empty + noSchedule, /Add exercises|Pick a day|Switch Day/);
  assert.doesNotMatch(render(<TodayEmptyDayCard kind="empty" actionHref={null} />), /<a /, "no editor href, no dead button");
});

test("Rest, empty and done days may add ONE Next line with a quiet Show button; no schedule never does", () => {
  const nextUp = { label: "Next: Pull A on Thu, Nov 27", actionLabel: "Show Pull A", onShow: () => {} };
  for (const kind of ["rest", "empty", "done"] as const) {
    const html = render(<TodayEmptyDayCard kind={kind} actionHref="/routines/r/edit" nextUp={nextUp} />);
    assert.equal((html.match(/<p[\s>]/g) ?? []).length, 1, "exactly one second line");
    assert.match(html, /data-today-next-up="true"/);
    assert.match(html, />Next: Pull A on Thu, Nov 27<\/p>/);
    const button = html.match(/<button [^>]*>Show Pull A<\/button>/)?.[0] ?? "";
    assert.ok(button.includes('type="button"'));
    assert.match(button, /app-button-tertiary/, "quiet variant");
  }
  assert.doesNotMatch(render(<TodayEmptyDayCard kind="noSchedule" actionHref="/routines/r/edit" nextUp={nextUp} />), /data-today-next-up/);
  const done = render(<TodayEmptyDayCard kind="done" actionHref="/routines/r/edit" nextUp={nextUp} />);
  assert.match(done, /<h2 class="[^"]*">Done today<\/h2>/);
  assert.doesNotMatch(done, /<a /, "done never offers an editor action");
  assert.match(done, /data-card-tone="completed"/, "done reads as completed (green), alongside its words");
  assert.match(done, /data-today-empty-mark="done"/);
  const picker = readFileSync(new URL("./TodayDayPicker.tsx", import.meta.url), "utf8");
  assert.match(picker, /<TodayEmptyDayCard kind="rest" nextUp=\{selectedDayNextUp\} \/>/);
  assert.match(picker, /onShow: \(\) => setSelectedDayIndex\(next\.dayIndex\)/, "Show selects the day; it never starts a workout");
});

test("TodayDayPicker wires all three empty states through TodayEmptyDayCard with the right editor hrefs", () => {
  const picker = readSource("./TodayDayPicker.tsx");
  assert.match(picker, /<TodayEmptyDayCard kind="rest" nextUp=\{selectedDayNextUp\} \/>/, "rest day: no editor action, only Next up");
  assert.match(picker, /kind="noSchedule"\s+actionHref=\{progressionRoutineId \? getRoutineEditHref\(progressionRoutineId, "\/today"\) : null\}/);
  assert.match(picker, /kind="empty"\s+actionHref=\{progressionRoutineId \? getRoutineDayEditHref\(progressionRoutineId, selectedDay\.id, "\/today"\) : null\}/);
  assert.doesNotMatch(picker, /Add exercises|<RestDayCard|<CardEmptyState|<RoutineOverviewDayCard/);
});

test("Today notice and state cards sit one card-gap (8px) above the exercise list; resume keeps the same spacing", () => {
  const picker = readSource("./TodayDayPicker.tsx");
  assert.match(picker, /mode\.dayPickerOpen \? ROUTINE_CONTENT_GAP_CLASS_NAME : "flex flex-col gap-2 pt-0\.5"/);

  const page = readSource("./page.tsx");
  assert.match(page, /<div className="pt-0\.5">/, "resume content is one list inside the scaffold, no extra gap wrapper");
  assert.doesNotMatch(page, /flex flex-col gap-\[0\.625rem\]/);
});
