import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { REST_DAY_CARD_COPY } from "@/features/day-state/restDayCardCopy";
import { RestDayCard, RoutineOverviewDayCard, type RoutineOverviewDayCardItem } from "./RoutineDayCardPresentation";

const START_DATE = "2026-04-27";

function day(partial: Partial<RoutineOverviewDayCardItem> & { dayIndex: number }): RoutineOverviewDayCardItem {
  return {
    isRest: false,
    splitSummary: { total: 3, strength: 2, cardio: 1, bodyweight: 0, unknown: 0 },
    ...partial,
  };
}

function renderDay(item: RoutineOverviewDayCardItem, props: Partial<Parameters<typeof RoutineOverviewDayCard>[0]> = {}) {
  return renderToStaticMarkup(<RoutineOverviewDayCard day={item} startDate={START_DATE} {...props} />);
}

test("day card: a reordered default-named day headlines as its position, never as the stale stored number (\"7 Tue\")", () => {
  const html = renderDay(day({ dayIndex: 6, name: "7", occurrenceWeekday: "Sat" }));

  assert.match(html, /data-card-title="true"[^>]*>Day 6</);
  assert.doesNotMatch(html, />7</);
  assert.match(html, /Sat/);
});

test("day card: a custom title takes the headline and Day N plus the weekday move to the meta line", () => {
  const html = renderDay(day({ dayIndex: 2, name: "Push", occurrenceWeekday: "Tue" }));

  assert.match(html, /data-card-title="true"[^>]*>Push</);
  assert.match(html, /Day 2[\s\S]*Tue[\s\S]*2 strength[\s\S]*1 cardio/);
});

test("day card: status chips carry text (TODAY, DONE with a check, SKIPPED with a glyph, REST, OPTIONAL)", () => {
  const html = renderDay(day({ dayIndex: 1, isToday: true, isCompleted: true, isSkipped: true, isOptional: true }));

  assert.match(html, /Today/);
  assert.match(html, /✓[\s\S]*Done/);
  assert.match(html, /⊘[\s\S]*Skipped/);
  assert.match(html, /Optional/);
  assert.match(renderDay(day({ dayIndex: 3, isRest: true })), /data-card-tone="attention"[\s\S]*Rest/);
});

test("day card: toggle interaction wires aria-expanded/controls and shows the recap only while expanded", () => {
  const recapExercises = [{ id: "e1", name: "Back Squat", targetLabel: "4 sets · 5 reps", signatureLabel: "Quads | Squat" }];
  const base = { interaction: "toggle" as const, onPress: () => {}, controlsId: "panel-1" };
  const closed = renderDay(day({ dayIndex: 1, recapExercises }), { ...base, isExpanded: false });
  const open = renderDay(day({ dayIndex: 1, recapExercises }), { ...base, isExpanded: true, footer: <div data-testid="footer" /> });

  assert.match(closed, /aria-expanded="false"[^>]*aria-controls="panel-1"|aria-controls="panel-1"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(closed, /data-routine-day-recap/);
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /data-routine-day-recap="true"/);
  assert.match(open, /Back Squat/);
  assert.match(open, /data-testid="footer"/);
});

test("day card: the drag handle is a separate trailing control, so the header button has no children", () => {
  const html = renderDay(day({ dayIndex: 1 }), {
    onPress: () => {},
    reorderHandle: <button type="button" aria-label="Reorder Day 1" />,
  });

  assert.match(html, /<button[^>]*data-card-hit="press"[^>]*><\/button>/);
  assert.match(html, /data-card-trailing="true"[^>]*><button[^>]*aria-label="Reorder Day 1"/);
});

test("RestDayCard: title and shared copy carry the meaning, there is no tap target, and it cannot trigger navigation", () => {
  const html = renderToStaticMarkup(<RestDayCard />);
  const source = readFileSync(new URL("./RoutineDayCardPresentation.tsx", import.meta.url), "utf8");
  const restDayCardBody = source.slice(source.indexOf("export function RestDayCard"), source.indexOf("export type RoutineDayCardPresentationItem"));

  assert.match(html, /data-rest-day-card="true"/);
  assert.match(html, />Rest</);
  assert.ok(html.includes(REST_DAY_CARD_COPY.replace(/&/g, "&amp;").replace(/'/g, "&#x27;")) || html.includes(REST_DAY_CARD_COPY));
  assert.match(html, /data-card-tone="attention"/);
  assert.doesNotMatch(html, /<button/);
  assert.ok(restDayCardBody.length > 0);
  assert.doesNotMatch(restDayCardBody, /onPress|router|action/i);
});

test("day card source has no sideways rail, accent underline or corner delete", () => {
  const source = readFileSync(new URL("./RoutineDayCardPresentation.tsx", import.meta.url), "utf8");
  const cardBody = source.slice(source.indexOf("function resolveRoutineDayMetaParts"));

  assert.doesNotMatch(cardBody, /HorizontalScrollHint|MetricAccentBar|routine-card-delete|SignatureMiniPipe/);
});

test("day card: asListItem wraps the card in an li so a ul parent keeps valid list markup (Today picker)", () => {
  const item = day({ dayIndex: 2, name: "Push", occurrenceWeekday: "Tue" });
  const html = renderToStaticMarkup(
    <ul>
      <RoutineOverviewDayCard day={item} startDate={START_DATE} asListItem />
      <RoutineOverviewDayCard day={day({ dayIndex: 3, name: "Pull" })} startDate={START_DATE} asListItem />
    </ul>,
  );

  assert.equal((html.match(/<li[ >]/g) ?? []).length, 2);
  assert.match(html, /^<ul><li[^>]*><div[^>]*data-routine-day-card="2"/);
  assert.doesNotMatch(html, /<ul><div/);
  // Without the wrapper the card is a plain surface (callers that already provide an li).
  assert.doesNotMatch(renderDay(item), /^<li/);
});
