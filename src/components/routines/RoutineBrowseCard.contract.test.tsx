import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "./RoutineBrowseCard";

const routine: RoutineBrowseCardItem = {
  id: "r1",
  name: "Atlas Routine",
  summaryParts: ["16 exercises", "4 workout plans", "1 rest", "3 sessions logged", "Last Nov 5"],
  createdAt: "2026-11-05T12:00:00Z",
  isActive: true,
  previewDays: [
    { id: "d1", dayIndex: 1, title: "Push", weekdayLabel: "Mon", isRest: false, exerciseCount: 8, isCompleted: true },
    { id: "d2", dayIndex: 2, title: "Rest", weekdayLabel: "Tue", isRest: true, exerciseCount: 0 },
  ],
};

test("routine card: heading, ACTIVE chip, canonical-term meta line and created date", () => {
  const html = renderToStaticMarkup(<RoutineBrowseCard routine={routine} onPress={() => {}} />);

  assert.match(html, /<h2[^>]*data-card-title="true"[^>]*>Atlas Routine<\/h2>/);
  assert.match(html, /data-card-chip="success"[^>]*>Active</);
  assert.match(html, /16 exercises[\s\S]*4 days[\s\S]*1 rest day[\s\S]*3 sessions[\s\S]*Last Nov 5[\s\S]*Created Nov 5/);
  assert.doesNotMatch(html, /workout plan|sessions logged|\blogs\b/i);
  assert.match(html, /data-card-tone="current"/);
});

test("routine card: header opens the routine; there is no corner Delete and no nested button", () => {
  const html = renderToStaticMarkup(<RoutineBrowseCard routine={routine} onPress={() => {}} />);

  assert.match(html, /data-card-hit="press"/);
  assert.doesNotMatch(html, />Delete</);
  assert.doesNotMatch(html, /routine-card-delete/);
  assert.equal((html.match(/<button/g) ?? []).length, 1, "only the stretched header button without actions");
});

test("routine card: the more control exposes aria-expanded/controls and the action row appears only when open", () => {
  const actions = [
    { key: "delete", label: "Delete", intent: "danger" as const, onPress: () => {} },
    { key: "set-active", label: "Set Active", intent: "toggle" as const, onPress: () => {} },
  ];
  const closed = renderToStaticMarkup(
    <RoutineBrowseCard routine={routine} onPress={() => {}} actions={actions} actionsOpen={false} onActionsToggle={() => {}} />,
  );
  const open = renderToStaticMarkup(
    <RoutineBrowseCard routine={routine} onPress={() => {}} actions={actions} actionsOpen onActionsToggle={() => {}} />,
  );

  assert.match(closed, /aria-label="Actions for Atlas Routine"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*aria-label="Actions for Atlas Routine"/);
  assert.doesNotMatch(closed, /data-card-actions/);
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /data-card-actions="true"/);
  assert.ok(open.indexOf(">Delete<") < open.indexOf(">Set Active<"), "destructive action first");
});

test("routine card: week strip wraps (no sideways scroll), one cell per day, full sentence for assistive tech", () => {
  const html = renderToStaticMarkup(<RoutineBrowseCard routine={routine} onPress={() => {}} />);
  const source = readFileSync(new URL("./RoutineBrowseCard.tsx", import.meta.url), "utf8");

  assert.match(html, /<ul aria-label="Days in this routine" data-routine-week-strip="true"/);
  assert.equal((html.match(/data-routine-week-cell=/g) ?? []).length, 2);
  assert.match(html, /Day 1, Mon: 8 exercises, done/);
  assert.match(html, /Day 2, Tue: rest day/);
  assert.match(html, /data-routine-week-cell="rest"/);
  assert.doesNotMatch(source, /HorizontalScrollHint|overflow-x-(auto|scroll)|SignatureMiniPipe|MetricAccentBar/);
});

test("routine card: inactive routines get the neutral tone, no chip, and no week strip when hidden", () => {
  const html = renderToStaticMarkup(
    <RoutineBrowseCard routine={{ ...routine, isActive: false }} showPreviewDays={false} />,
  );

  assert.match(html, /data-card-tone="neutral"/);
  assert.doesNotMatch(html, /data-card-chip=/);
  assert.doesNotMatch(html, /data-routine-week-strip/);
  assert.doesNotMatch(html, /<button/, "static (offline) card has no tap target");
});
