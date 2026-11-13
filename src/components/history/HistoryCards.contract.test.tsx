import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { SessionSummary } from "@/app/history/session-summary";
import { DetailSectionItems } from "@/components/ui/DetailSectionList";
import { buildHistoryCalendarView } from "@/lib/history-calendar";
import { getHistoryPreviewSessionsPageData } from "@/lib/history-preview-fixtures";
import { HistoryCalendarSurface } from "./HistoryCalendarSurface";
import { HistoryDetailExerciseCard, resolveHistorySignalChip } from "./HistoryDetailExerciseCard";
import { HistoryDisclosureCard, HistoryMetricsDisclosure } from "./HistoryMetricsDisclosure";
import { HistoryExerciseCard } from "./HistoryExerciseCard";
import { HistorySessionCard, buildRecapOnlyHistorySessionDetailSections, buildSessionStatusChips } from "./HistorySessionCard";
import { toHistoryMetaText, toHistoryStatItem } from "./historyStats";

const here = new URL("./", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, here), "utf8");
const data = getHistoryPreviewSessionsPageData();
const session: SessionSummary = data.sessionItems[0];

function countMatches(html: string, pattern: RegExp) {
  return (html.match(pattern) ?? []).length;
}

test("session card (list): one h2, the header is a stretched link, the heading is not inside an anchor", () => {
  const html = renderToStaticMarkup(
    <HistorySessionCard session={session} viewMode="compact" href="/history/abc?returnTab=sessions" selected />,
  );

  assert.match(html, /data-history-card="session"/);
  assert.match(html, /data-history-density="compact"/);
  assert.equal(countMatches(html, /<h2/g), 1);
  assert.equal(countMatches(html, /<h[1-6]/g), 1);
  assert.match(html, /<a [^>]*data-card-hit="link"[^>]*href="\/history\/abc\?returnTab=sessions"/);
  // Named by the visible title and described by the meta line; selected is exposed as aria-current.
  assert.match(html, /<a [^>]*aria-labelledby="[^"]+"[^>]*aria-describedby="[^"]+"/);
  assert.match(html, /aria-current="page"/);
  assert.doesNotMatch(html, /<a [^>]*>(?:(?!<\/a>).)*<h2/);
  assert.match(html, /Lower Rotation/);
  assert.match(html, /data-card-tone="current"/);
});

test("session card without href is static and an unselected card is neutral without aria-current", () => {
  const html = renderToStaticMarkup(<HistorySessionCard session={session} viewMode="compact" />);

  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /aria-current/);
  assert.match(html, /data-card-tone="neutral"/);
});

test("session signals are status chips, spelled out, all visible (no rotating badge)", () => {
  const chips = buildSessionStatusChips(session).map((chip) => chip.label);
  assert.ok(chips.includes("PR"));
  assert.ok(chips.includes("Promotion"));
  assert.ok(chips.includes("Manual"));
  for (const label of chips) {
    assert.doesNotMatch(label, /^(PROMO|REG|EVENT)$/);
  }

  const html = renderToStaticMarkup(<HistorySessionCard session={session} viewMode="compact" href="/x" />);
  for (const label of chips) {
    assert.match(html, new RegExp(`>${label}<`));
  }
});

test("session meta keeps the day, the date and the outcome, and never shows a stray pipe", () => {
  const html = renderToStaticMarkup(<HistorySessionCard session={session} viewMode="compact" href="/x" />);

  assert.match(html, /Day 5/);
  assert.match(html, /Apr 21/);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, " "), / \| /);
  assert.equal(toHistoryMetaText("24m | 1.8 mi"), "24m · 1.8 mi");
});

test("detailed session card renders the metrics as a wrapping stat grid and the recap as a list, with no sideways scroller", () => {
  const html = renderToStaticMarkup(<HistorySessionCard session={session} viewMode="detailed" href="/x" />);

  assert.match(html, /data-card-stat-grid="true"/);
  assert.match(html, /<dl[^>]*>/);
  assert.match(html, /data-history-session-body="true"/);
  assert.match(html, /<ul data-detail-items="inline"/);
  assert.match(html, /Back Squat/);
  assert.doesNotMatch(html, /overflow-x-auto|min-w-max|data-scroll-hint/);
});

test("headerless detailed session card (session detail summary) has no heading or link and keeps metrics + recap", () => {
  const html = renderToStaticMarkup(
    <HistorySessionCard
      session={session}
      viewMode="detailed"
      detailedHeaderMode="hidden"
      detailedMetrics={[{ label: "Session Time", value: "26m" }, { label: "Completion", value: "100%", valueTone: "success" }]}
    />,
  );

  assert.doesNotMatch(html, /<h[1-6]/);
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /Session Time/);
  assert.match(html, /26m/);
  assert.match(html, /Completion/);
});

test("recap sections still carry the observed-rest row (FF-SESSION-005): a Rest inline section renders as a wrapping list item", () => {
  const rest = renderToStaticMarkup(
    <DetailSectionItems
      layout="inline"
      items={[{ id: "session-observed-rest", primary: "Typical rest", value: "1:30", meta: "Between working sets", layout: "single-column" }]}
    />,
  );
  assert.match(rest, /<ul data-detail-items="inline"[^>]*><li/);
  assert.match(rest, /Typical rest/);
  assert.match(rest, /1:30/);
  assert.match(rest, /Between working sets/);
  assert.doesNotMatch(rest, /whitespace-nowrap|min-w-max/);

  const auditSource = readFileSync(new URL("../../app/history/[sessionId]/LogAuditClient.tsx", import.meta.url), "utf8");
  assert.match(auditSource, /title: "Rest"/);
  assert.match(auditSource, /primary: "Typical rest"/);
  assert.match(auditSource, /buildSessionRecoverySummary/);

  const sections = buildRecapOnlyHistorySessionDetailSections(session, session.prExerciseNames ?? []);
  assert.equal(sections[0]?.title, "Recap");
  assert.equal(sections[0]?.layout, "inline");
});

test("disclosure card (compact): the header toggles a panel that stays mounted, with aria-expanded and aria-controls", () => {
  const html = renderToStaticMarkup(
    <HistoryDisclosureCard title="Monthly" titleMeta="Nov 2026" summaryItems={["Up", "3 sessions", "Up", null]}>
      <p>panel body</p>
    </HistoryDisclosureCard>,
  );

  assert.match(html, /<section[^>]*data-history-compact-disclosure="true"/);
  assert.match(html, /<h2[^>]*>Monthly<span[^>]*>Nov 2026<\/span><\/h2>/);
  const controls = html.match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controls);
  assert.match(html, new RegExp(`<div id="${controls}" hidden=""`));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /panel body/);
  // Every summary fact is visible once (de-duplicated, blanks dropped), in one meta line.
  assert.equal(countMatches(html, />Up</g), 1);
  assert.match(html, />3 sessions</);
});

test("disclosure card (detailed) is the same card with the panel open and no toggle", () => {
  const html = renderToStaticMarkup(
    <HistoryDisclosureCard title="Cycle Progression" viewMode="detailed"><p>open body</p></HistoryDisclosureCard>,
  );

  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, / hidden=""/);
  assert.match(html, /open body/);
});

test("metrics disclosure turns metrics into a stat grid (labels, tones, no horizontal scroller)", () => {
  const html = renderToStaticMarkup(
    <HistoryMetricsDisclosure
      title="Session Streak"
      titleMeta="Apr 20"
      viewMode="detailed"
      items={[
        { label: "Current", value: "3 sessions", valueTone: "success" },
        { label: "Last Workout", value: "Apr 21, 2026" },
      ]}
    />,
  );

  assert.match(html, /<dt[^>]*>Current<\/dt>/);
  assert.match(html, /3 sessions/);
  assert.doesNotMatch(html, /overflow-x-auto|min-w-max/);
});

test("stat items keep arrows as glyph + text and fold delta / timeframe / trend into meta", () => {
  const item = toHistoryStatItem({ label: "Vs Last", value: "+2", valuePrefix: "↑", delta: "vs prior", trend: "rising" });
  assert.equal(item.direction, "up");
  assert.deepEqual(item.meta, ["vs prior", "rising"]);
  assert.equal(toHistoryStatItem({ label: "x", value: "1", valuePrefix: "*" }).value, "* 1");
});

test("detail exercise card: toggle row (aria-expanded), signal chips spelled out, set count as meta, summary as a stat", () => {
  const html = renderToStaticMarkup(
    <HistoryDetailExerciseCard
      exercise={{ name: "Back Squat" }}
      summary="5 reps · 245 lbs"
      summaryLabel="Top Set"
      metaItems={["4/4 sets", "Timer 0:30"]}
      signalCodes={["PR", "BEST", "PROMO", "REG", "WATCH", "MANUAL", "PR"]}
      showLeadingVisual={false}
      expanded
      onPress={() => {}}
    />,
  );

  assert.match(html, /data-history-card="detail-exercise"/);
  assert.match(html, /data-history-surface="history-detail"/);
  assert.match(html, /data-history-expanded="true"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /data-card-affordance="toggle"/);
  assert.match(html, /<h2[^>]*>Back Squat<\/h2>/);
  assert.match(html, />4\/4 sets</);
  assert.match(html, />Top Set</);
  for (const label of ["PR", "Best", "Promotion", "Regression", "Watch", "Manual"]) {
    assert.equal(countMatches(html, new RegExp(`>${label}<`, "g")), 1, label);
  }
  assert.equal(resolveHistorySignalChip("promo").label, "Promotion");
  assert.equal(resolveHistorySignalChip("HARD").label, "HARD");

  const staticHtml = renderToStaticMarkup(<HistoryDetailExerciseCard exercise={{ name: "Plank" }} showLeadingVisual={false} />);
  assert.doesNotMatch(staticHtml, /<button/);
});

test("exercise browser card: header press opens the exercise, facts stay on two meta lines, detailed adds a body", () => {
  const compact = renderToStaticMarkup(
    <HistoryExerciseCard
      exercise={{ name: "Back Squat" }}
      showMedia={false}
      title="Back Squat"
      summaryLabel="Last"
      summary="245lbx5"
      comparison="Matched | best"
      metaItems={["Quads", "Squat"]}
      badgeItems={["1 PR", "2 Sessions"]}
      density="compact"
      tone="logged"
      onPress={() => {}}
    />,
  );
  assert.match(compact, /data-history-card="exercise"/);
  assert.match(compact, /data-history-surface="history-browser"/);
  assert.match(compact, /data-card-affordance="press"/);
  assert.match(compact, />Last</);
  assert.match(compact, /245lbx5 · Matched · best/);
  assert.match(compact, />1 PR</);
  assert.doesNotMatch(compact, /aria-expanded/);

  const detailed = renderToStaticMarkup(
    <HistoryExerciseCard
      exercise={{ name: "Back Squat" }}
      showMedia={false}
      title="Back Squat"
      summaryLabel="Last"
      summary="245lbx5"
      metrics={[{ label: "Sessions", value: "2" }]}
      detailSections={[{ title: "Notes", items: ["Felt strong"] }]}
      density="detailed"
      tone="logged"
      onPress={() => {}}
    />,
  );
  assert.match(detailed, /data-card-stat-grid="true"/);
  assert.match(detailed, /<h3[^>]*>Notes<\/h3><ul/);
  assert.match(detailed, /<li[^>]*>Felt strong<\/li>/);
});

test("calendar: one month at a time, 44px day cells, a labelled pager and a live month label", () => {
  const sessionsAcrossMonths = ["2026-02-10T12:00:00.000Z", "2026-03-10T12:00:00.000Z", session.startedAt].map((startedAt, index) => ({
    ...session,
    id: `calendar-${index}`,
    startedAt,
  }));
  const view = buildHistoryCalendarView({
    sessions: sessionsAcrossMonths,
    timezone: "UTC",
    skippedDayKeys: ["2026-04-22"],
    now: "2026-04-23T12:00:00.000Z",
  });
  assert.ok(view.months.length > 1, "fixture spans several months");

  const html = renderToStaticMarkup(<HistoryCalendarSurface calendarView={view} onSelectDayKey={() => {}} viewMode="compact" />);

  assert.match(html, /<h2[^>]*>Calendar<\/h2>/);
  assert.equal(countMatches(html, /data-calendar-month-label="true"/g), 1);
  assert.ok(html.includes(view.months[0].monthLabel), "newest month first");
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-calendar-nav="older"[^>]*>/);
  assert.match(html, new RegExp(`aria-label="Show ${view.months[1].monthLabel}"`));
  // Newest month: the newer control is present but disabled.
  assert.match(html, /<button[^>]*aria-disabled="true"[^>]*data-calendar-nav="newer"/);
  assert.doesNotMatch(html, /data-calendar-nav="[a-z]+"[^>]*disabled=""|disabled=""[^>]*data-calendar-nav/);
  assert.match(html, /data-calendar-day-state="training"/);
  // The name starts with the printed day and says what the cell means; days with nothing to say keep their printed name.
  assert.match(html, /aria-label="\d+, 1 session"/);
  assert.match(html, /aria-label="22, planned workout skipped"/);
  assert.doesNotMatch(html, /sr-only/);
  // The shown month is held by key, so a newer month arriving does not switch the view.
  const calendarSource = read("HistoryCalendarSurface.tsx");
  assert.match(calendarSource, /shownMonthKey/);
  assert.match(calendarSource, /months\.findIndex\(\(candidate\) => candidate\.monthKey === shownMonthKey\)/);
  assert.doesNotMatch(calendarSource, /requestedIndex/);
  assert.match(html, /data-calendar-day-filler="true"/);
  assert.match(html, /flex h-11 min-w-0 flex-col/);
  assert.doesNotMatch(html, /aspect-square|min-h-\[2\.2rem\]|min-w-\[17\.5rem\]/);
});

test("History card sources: no sideways scroller, no rotating timers, no hand-rolled expand chevrons, no radius restated", () => {
  const files = readdirSync(here).filter((name) => /\.tsx?$/.test(name) && !/\.test\./.test(name));
  const cardFiles = [
    "HistorySessionCard.tsx",
    "HistoryExerciseCard.tsx",
    "HistoryDetailExerciseCard.tsx",
    "HistoryMetricsDisclosure.tsx",
    "HistoryScopeSummarySurface.tsx",
    "WeeklyProgressSurface.tsx",
    "MonthlyProgressSurface.tsx",
    "WorkoutStreakSurface.tsx",
    "HistoryCalendarSurface.tsx",
  ];
  for (const name of cardFiles) {
    assert.ok(files.includes(name), `${name} exists`);
    const source = read(name);
    assert.doesNotMatch(source, /HorizontalScrollHint|overflow-x-auto|min-w-max/, `${name}: no sideways scroller`);
    assert.doesNotMatch(source, /setInterval/, `${name}: no rotating timer`);
    assert.doesNotMatch(source, /ChevronDownIcon[\s\S]*ChevronRightIcon[\s\S]*expanded/, `${name}: expand state goes through CardHeader`);
    assert.doesNotMatch(source, /rounded-\[var\(--card-radius\)\]|from "@\/components\/ExerciseCard"|StandardExerciseRow/, `${name}: one card surface`);
    assert.doesNotMatch(source, /text-\[(?:[0-9]|10)(?:\.\d+)?px\]|text-\[0\.[0-6]\d*rem\]/, `${name}: nothing under 11px`);
  }
  assert.doesNotMatch(read("HistoryCalendarSurface.tsx"), /HorizontalScrollHint/);
});

test("History routes use the card components and the dev fixture is behind the dev guard", () => {
  const overview = readFileSync(new URL("../../app/dev/history-overview/page.tsx", import.meta.url), "utf8");
  const guardIndex = overview.indexOf("assertDevPageAvailable();");
  const firstUse = overview.indexOf("getHistoryPreviewSessionsPageData()");
  assert.ok(guardIndex > 0 && guardIndex < firstUse, "guard runs before any fixture data is read");
  assert.match(overview, /export const dynamic = "force-dynamic"/);

  const audit = readFileSync(new URL("../../app/history/[sessionId]/LogAuditClient.tsx", import.meta.url), "utf8");
  assert.match(audit, /<HistoryDetailExerciseCard/);
  assert.doesNotMatch(audit, /shellStyle=|mediaClassName=|badgeItems=/);
});
