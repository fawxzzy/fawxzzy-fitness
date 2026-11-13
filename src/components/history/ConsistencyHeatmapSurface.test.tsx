import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { SessionSummary } from "@/app/history/session-summary";
import { buildHistoryConsistencyHeatmap } from "@/lib/history-consistency-heatmap";
import { ConsistencyHeatmapSurface } from "./ConsistencyHeatmapSurface";

const surfaceSource = readFileSync(new URL("./ConsistencyHeatmapSurface.tsx", import.meta.url), "utf8");
const historyClientSource = readFileSync(new URL("../../app/history/HistorySessionsClient.tsx", import.meta.url), "utf8");

const NOW = "2026-11-12T15:00:00.000Z";
const TIMEZONE = "America/New_York";

function session(id: string, startedAt: string): SessionSummary {
  return {
    id,
    startedAt,
    routineTitle: "Atlas",
    exerciseCount: 1,
    setCount: 1,
    repCount: 5,
    prCounts: { total: 0, weight: 0, reps: 0 },
    prLabel: "",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
}

function render(sessions: SessionSummary[], viewMode: "compact" | "detailed") {
  const heatmap = buildHistoryConsistencyHeatmap({ sessions, timezone: TIMEZONE, now: NOW });
  return renderToStaticMarkup(<ConsistencyHeatmapSurface heatmap={heatmap} viewMode={viewMode} />);
}

function countMatches(html: string, pattern: RegExp) {
  return (html.match(pattern) ?? []).length;
}

const ACTIVE_SESSIONS = [
  session("one", "2026-11-09T14:00:00.000Z"),
  session("two-a", "2026-11-10T14:00:00.000Z"),
  session("two-b", "2026-11-10T18:00:00.000Z"),
  session("three-a", "2026-11-11T13:00:00.000Z"),
  session("three-b", "2026-11-11T16:00:00.000Z"),
  session("three-c", "2026-11-11T19:00:00.000Z"),
  // 02:35Z on Nov 6 is the evening of Nov 5 in US Eastern: it belongs to Nov 5, not to the UTC date.
  session("boundary", "2026-11-06T02:35:00.000Z"),
];

test("heatmap renders one labelled square per day for the whole 16-week window", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  assert.equal(countMatches(html, /data-heatmap-day="/g), 16 * 7);
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="7 sessions on 4 active days in the last 16 weeks\. Brighter green squares and higher numbers mean more sessions that day\."/);
  assert.match(html, /data-heatmap-day="2026-11-05" data-heatmap-count="1"/);
  assert.match(html, /data-heatmap-day="2026-11-06" data-heatmap-count="0"/);
  assert.match(html, /data-heatmap-day="2026-11-10" data-heatmap-count="2" data-heatmap-tone="medium"/);
  assert.match(html, /data-heatmap-day="2026-11-11" data-heatmap-count="3" data-heatmap-tone="high"/);
});

test("heatmap marks exactly one local today and dims the days that have not happened yet", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  assert.equal(countMatches(html, /data-heatmap-today="true"/g), 1);
  assert.match(html, /data-heatmap-day="2026-11-12"[^>]*data-heatmap-today="true"/);
  assert.equal(countMatches(html, /data-heatmap-tone="future"/g), 3);
});

test("heatmap does not rely on colour alone: a dot for one session, the count for more, and a legend", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  // One session is a 5px dot (not 3px), and the cue text is at least 10px.
  assert.match(html, /data-heatmap-day="2026-11-05" data-heatmap-count="1"[^>]*><span aria-hidden="true" class="block h-\[5px\] w-\[5px\] rounded-full bg-current"><\/span>/);
  assert.match(html, /data-heatmap-day="2026-11-10"[^>]*class="[^"]*text-\[0\.625rem\]/);
  assert.doesNotMatch(html, /text-\[0\.5rem\]/);
  // Cells with two and three sessions carry their count as text.
  assert.match(html, /data-heatmap-count="2"[^>]*>(?:<span[^>]*>2<\/span>)/);
  assert.match(html, /data-heatmap-count="3"[^>]*>(?:<span[^>]*>3<\/span>)/);
  assert.match(html, /data-history-consistency-heatmap="legend"/);
  assert.match(html, />Less</);
  assert.match(html, />More</);
  assert.match(html, />Today</);
  assert.match(html, />3\+</);
});

test("heatmap exposes the active days to assistive tech as text", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  assert.match(html, /<ul class="sr-only" aria-label="Active days">/);
  assert.match(html, /<li>Nov 11, 2026: 3 sessions<\/li><li>Nov 10, 2026: 2 sessions<\/li><li>Nov 9, 2026: 1 session<\/li>/);
  assert.match(html, /<li>Nov 5, 2026: 1 session<\/li>/);
});

test("heatmap names today for assistive tech, listed first even before today has a session", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  assert.match(html, /aria-label="Active days"><li>Nov 12, 2026 \(today\): 0 sessions<\/li><li>Nov 11, 2026: 3 sessions<\/li>/);
  assert.match(html, /title="Nov 12, 2026 \(today\): 0 sessions" data-heatmap-day="2026-11-12"/);

  const withToday = render([...ACTIVE_SESSIONS, session("today", "2026-11-12T13:00:00.000Z")], "detailed");
  assert.match(withToday, /<li>Nov 12, 2026 \(today\): 1 session<\/li>/);

  // A brand new user still gets today named, and nothing else.
  assert.match(render([], "detailed"), /aria-label="Active days"><li>Nov 12, 2026 \(today\): 0 sessions<\/li><\/ul>/);
});

test("heatmap shows month labels without shifting days across the UTC boundary", () => {
  const html = render([], "detailed");

  assert.match(html, /data-heatmap-month="2026-08"[^>]*>Aug</);
  assert.match(html, /data-heatmap-month="2026-09"[^>]*>Sep</);
  assert.match(html, /data-heatmap-month="2026-10"[^>]*>Oct</);
  assert.match(html, /data-heatmap-month="2026-11"[^>]*>Nov</);
});

test("empty heatmap for a new user is encouraging, not sad", () => {
  const html = render([], "detailed");

  assert.match(html, /data-history-consistency-heatmap="empty"/);
  assert.match(html, /Finish your first workout and it lights up the first square\./);
  assert.equal(countMatches(html, /data-heatmap-day="/g), 16 * 7);
  assert.doesNotMatch(html, /nothing|no data|failed|inactive|missed/i);
  // The invitation takes the summary slot: no visible "No sessions yet." line above the empty grid.
  assert.doesNotMatch(html, /data-history-consistency-heatmap="summary"/);
});

test("a quiet stretch keeps the map and invites the next workout", () => {
  const html = render([session("old", "2026-01-05T15:00:00.000Z")], "detailed");

  assert.match(html, /A quiet stretch\. Your next workout puts a square back on the map\./);
  assert.match(html, /aria-label="No sessions in the last 16 weeks\. Brighter green squares/);
  assert.doesNotMatch(html, /data-history-consistency-heatmap="summary"/);
  assert.doesNotMatch(html, /first workout/);
});

test("active heatmap has no empty-state message", () => {
  const html = render(ACTIVE_SESSIONS, "detailed");

  assert.doesNotMatch(html, /data-history-consistency-heatmap="empty"/);
  assert.match(html, /data-history-consistency-heatmap="summary"[^>]*>7 sessions on 4 active days in the last 16 weeks\.</);
});

test("compact History view collapses into the canonical disclosure with a rotating summary", () => {
  const html = render(ACTIVE_SESSIONS, "compact");

  assert.match(html, /data-history-compact-disclosure="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Consistency/);
  assert.match(html, /16 weeks/);
  assert.match(html, />7 sessions</);
  // The grid is rendered but hidden until the disclosure opens.
  assert.match(html, /<div id="[^"]+" hidden="" class="pt-2">/);
  assert.equal(countMatches(html, /data-heatmap-day="/g), 16 * 7);
});

test("compact empty heatmap summary invites the first workout", () => {
  assert.match(render([], "compact"), />Start your map</);
  assert.match(render([session("old", "2026-01-05T15:00:00.000Z")], "compact"), />Ready when you are</);
});

test("heatmap fits the card at phone widths without a horizontal scroller or fixed-width grid", () => {
  assert.doesNotMatch(surfaceSource, /HorizontalScrollHint/);
  assert.doesNotMatch(surfaceSource, /overflow-x-auto|min-w-max|min-w-\[/);
  // Week columns share the available width and cells stay square, so 16 weeks fit 320px.
  assert.match(surfaceSource, /repeat\(\$\{heatmap\.weeks\.length\}, minmax\(0, 1fr\)\)/);
  assert.match(surfaceSource, /aspect-square/);
});

test("heatmap uses the shared History disclosure and section shells and the calendar green ramp", () => {
  assert.match(surfaceSource, /HistoryCompactDisclosure/);
  assert.match(surfaceSource, /HistorySection/);
  assert.match(surfaceSource, /--success-rgb/);
  assert.doesNotMatch(surfaceSource, /blue|sky-|indigo/);
});

test("History mounts the heatmap right after the streak, as the surface the History UI verifier expects", () => {
  assert.ok(historyClientSource.includes('from "@/components/history/ConsistencyHeatmapSurface"'));
  assert.ok(historyClientSource.includes("<ConsistencyHeatmapSurface"));
  assert.ok(historyClientSource.includes("shouldShowHistoryConsistencyHeatmap("));

  const calendarIndex = historyClientSource.indexOf('data-history-retention-surface="calendar"');
  const streakIndex = historyClientSource.indexOf('data-history-retention-surface="streak"');
  const heatmapIndex = historyClientSource.indexOf('data-history-retention-surface="heatmap"');
  const summaryIndex = historyClientSource.indexOf("<HistoryScopeSummarySurface");
  assert.ok(calendarIndex >= 0);
  assert.ok(calendarIndex < streakIndex);
  assert.ok(streakIndex < heatmapIndex);
  assert.ok(heatmapIndex < summaryIndex);
  // The surface is only rendered behind the visibility helper, never unconditionally.
  const showIndex = historyClientSource.indexOf("{showConsistencyHeatmap ?");
  assert.ok(showIndex >= 0 && showIndex < heatmapIndex);
  // scripts/verify-history-family-ui.mjs asserts this exact surface name in the History retention stack.
  assert.ok(readFileSync(new URL("../../../scripts/verify-history-family-ui.mjs", import.meta.url), "utf8").includes('["calendar", "monthly", "streak", "heatmap"]'));
});
