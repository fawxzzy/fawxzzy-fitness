import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isDevOnlyPath } from "../../lib/dev-route-guard.ts";
import { getDurationWholeMinutes } from "../../lib/duration.ts";
import { SessionExerciseFeedbackPrompt } from "./SessionExerciseFeedbackPrompt.tsx";
import { TodayExerciseRows } from "../../app/today/TodayExerciseRows.tsx";
import {
  buildSessionFinishedFacts,
  SessionExerciseRowCard,
  SessionFinishedCard,
  SessionHiddenRowCard,
  SessionQuickLogRow,
  SessionRowActionButton,
} from "./SessionRowCards.tsx";

function readSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const exercise = { name: "Zed Press", slug: "zed-press" };

const baseRowContract = {
  label: "Log: 5 reps | 225 lbs",
  skipLabel: "Skip",
  skipActionIntent: "toggleInactive" as const,
  isQuickLogDisabled: false,
  isSkipDisabled: false,
  quickLogDisabledMessage: "Unskip to log",
  isSkipPending: false,
  isQuickLogPending: false,
};

function renderRow(expanded: boolean, extra: Partial<Parameters<typeof SessionExerciseRowCard>[0]> = {}) {
  return renderToStaticMarkup(
    <SessionExerciseRowCard
      itemId="se-1"
      exercise={exercise}
      expanded={expanded}
      onToggle={() => {}}
      metaItems={["Quads", "Squat"]}
      targetValues={["4 sets", "5 reps", "225 lbs"]}
      progressionLabel="AUTO"
      progress={{ label: "1 / 4 sets", percent: 25 }}
      status={null}
      tone="logged"
      showMedia
      infoLabel="Open exercise info for Zed Press"
      onOpenInfo={() => {}}
      panel={<div data-testid="logger-stub">logger</div>}
      footer={<div data-testid="footer-stub">footer</div>}
      {...extra}
    />,
  );
}

test("session row is a toggle card: heading title, stretched header button with the pinned test id and panel wiring", () => {
  const html = renderRow(false);

  assert.match(html, /<h2[^>]*data-card-title="true"[^>]*>Zed Press<\/h2>/);
  const hit = html.match(/<button[^>]*data-card-hit="toggle"[^>]*>/)?.[0];
  assert.ok(hit, "toggle header button present");
  assert.match(hit, /data-testid="session-exercise-toggle-se-1"/);
  assert.match(hit, /aria-expanded="false"/);
  assert.match(hit, /aria-controls="session-exercise-panel-se-1"/);
  assert.match(hit, /aria-labelledby=/);
  assert.match(html, /1 \/ 4 sets/);
  assert.match(html, /225 lbs/);
});

test("collapsed row shows the footer and no panel; expanded row shows the logger panel with the pinned ids and no footer", () => {
  const collapsed = renderRow(false);
  assert.match(collapsed, /footer-stub/);
  assert.doesNotMatch(collapsed, /logger-stub/);
  assert.doesNotMatch(collapsed, /id="session-exercise-panel-se-1"/);

  const expanded = renderRow(true);
  assert.match(expanded, /logger-stub/);
  assert.doesNotMatch(expanded, /footer-stub/);
  assert.match(expanded, /id="session-exercise-panel-se-1"/);
  assert.match(expanded, /data-testid="session-exercise-panel-se-1"/);
  assert.match(expanded, /aria-expanded="true"/);
});

test("info control is a sibling 44px card control (not inside the header button) and its name contains the exercise name", () => {
  const html = renderRow(false);
  const info = html.match(/<button[^>]*aria-label="Open exercise info for Zed Press"[^>]*>/)?.[0];

  assert.ok(info);
  assert.match(info, /min-h-11/);
  assert.match(info, /min-w-11/);
  assert.doesNotMatch(html, /1\.625rem/);
  assert.doesNotMatch(html, /<button[^>]*data-card-hit[^>]*>[^<]*<(button|span)/, "header button has no children");
});

test("status chip: DONE and SKIPPED carry a glyph, Added is plain text, none renders no chip", () => {
  assert.match(renderRow(false, { status: "done" }), /✓[\s\S]*Done/);
  assert.match(renderRow(false, { status: "added" }), />Added</);
  assert.doesNotMatch(renderRow(false, { status: null }), /data-card-chip=/);
  const hidden = renderToStaticMarkup(
    <SessionHiddenRowCard exercise={exercise} status="skipped" progress={null} action={<button type="button">Unskip</button>} />,
  );
  assert.match(hidden, /⊘[\s\S]*Skipped/);
  assert.match(hidden, /Unskip/);
  assert.doesNotMatch(hidden, /data-card-leading/, "hidden row has no thumbnail");
});

test("quick-log row: Skip, Log all and Log set keep their order, 44px height class and label-in-name", () => {
  const html = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={3} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  );
  const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];

  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /aria-label="Skip: Zed Press"/);
  assert.match(buttons[0], /!h-11/);
  assert.match(buttons[1], /aria-label="Log all remaining sets: Zed Press"/);
  assert.match(buttons[2], /Log/);
  assert.match(buttons[2], /5 reps · 225 lbs/);
  assert.match(html, /role="group" aria-label="Quick actions for Zed Press"/);
  assert.doesNotMatch(html, /text-\[(9|10)px\]/);
});

test("quick-log row without remaining sets drops Log all; pending and disabled states use aria-disabled, never native disabled", () => {
  const two = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.equal((two.match(/<button/g) ?? []).length, 2);

  const pending = renderToStaticMarkup(
    <SessionQuickLogRow
      exerciseName="Zed Press"
      logAllCount={2}
      rowContract={{ ...baseRowContract, isQuickLogPending: true }}
      onSkip={() => {}}
      onPress={() => {}}
    />,
  );
  assert.equal((pending.match(/aria-disabled="true"/g) ?? []).length, 3);
  assert.doesNotMatch(pending, /\sdisabled(=|\s|>)/, "focus survives a pending save: no native disabled");
  assert.match(pending, /Adding\.\.\./);

  const blocked = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={{ ...baseRowContract, isQuickLogDisabled: true }} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.match(blocked, /Unskip to log/);
});

test("an inactive action button never runs its handler (the guard replaces native disabled)", () => {
  const source = readSource("./SessionRowCards.tsx");
  assert.match(source, /if \(inactive\) \{\s*return;\s*\}\s*onPress\(\);/);

  const html = renderToStaticMarkup(
    <SessionRowActionButton intent="neutral" label="Unskip" inactive onPress={() => {}} />,
  );
  assert.match(html, /aria-disabled="true"/);
});

test("finished card: status role, heading, facts from sessions data, Continue hint; no facts line when nothing was logged", () => {
  const facts = buildSessionFinishedFacts({
    exercises: [
      { loggedSetCount: 3, isSkipped: false },
      { loggedSetCount: 1, isSkipped: false },
      { loggedSetCount: 2, isSkipped: true },
      { loggedSetCount: 0, isSkipped: false },
    ],
    durationSeconds: 2700,
  });
  assert.deepEqual(facts, ["2 exercises", "4 sets", "45 min"]);
  assert.deepEqual(buildSessionFinishedFacts({ exercises: [{ loggedSetCount: 1, isSkipped: false }], durationSeconds: 59 }), ["1 exercise", "1 set"]);
  assert.deepEqual(buildSessionFinishedFacts({ exercises: [], durationSeconds: 0 }), []);

  const html = renderToStaticMarkup(<SessionFinishedCard facts={facts} />);
  assert.match(html, /role="status"/);
  assert.match(html, /<h2[^>]*>Workout saved<\/h2>/);
  assert.match(html, /2 exercises/);
  assert.match(html, /Continue to return to your workout overview\./);
  assert.doesNotMatch(renderToStaticMarkup(<SessionFinishedCard facts={[]} />), /data-card-meta/);
});

test("SessionExerciseFocus is presentation-migrated: no legacy card engine, same handlers and data attributes", () => {
  const focus = readSource("../SessionExerciseFocus.tsx");

  assert.doesNotMatch(focus, /ExerciseDisclosureCard|AttachedQuickActionStrip|<ExerciseCardStandardTitle|StandardExerciseRow|COMPACT_SESSION_ROW_SHELL/);
  assert.match(focus, /<SessionExerciseRowCard/);
  assert.match(focus, /<SessionQuickLogRow/);
  assert.match(focus, /<SessionHiddenRowCard/);
  assert.match(focus, /data-session-exercise-row-id=\{exercise\.id\}/);
  assert.match(focus, /onToggle=\{\(\) => toggleExercise\(exercise\.id\)\}/);
  assert.match(focus, /onOpenInfo=\{\(\) => setExerciseInfoExerciseId\(exercise\.exerciseId\)\}/);
  assert.match(focus, /<SetLoggerCard/);
  assert.match(focus, /<SessionExerciseFeedbackPrompt/);
});

test("feedback prompt: 44px effort and signal buttons, 11px text, named groups, note input named and 44px", () => {
  const source = readSource("./SessionExerciseFeedbackPrompt.tsx");

  assert.match(source, /aria-label="Exercise feedback"/);
  assert.match(source, /aria-label="Effort, 1 to 10"/);
  assert.match(source, /aria-label=\{`Effort \$\{value\} out of 10`\}/);
  assert.equal((source.match(/min-h-11/g) ?? []).length, 4, "header row, Rate toggle, signal chips and effort buttons");
  assert.match(source, /h-11 w-full/, "note input");
  assert.doesNotMatch(source, /h-6 w-6|h-7 |text-\[(9|10)px\]|overflow-x-auto/);
});

test("set logger: delete-set button is 44px tall and the logger strip text is not below 11px", () => {
  const timers = readSource("../SessionTimers.tsx");

  assert.match(timers, /className: "!h-11 !min-h-0 rounded-full !px-4 text-\[12px\]/);
  assert.doesNotMatch(timers, /!h-6 !min-h-0/);
  assert.doesNotMatch(timers, /gap-1\.5 text-\[10px\] leading-tight/);
});

test("offline session shell renders the shared Today exercise rows; the legacy planned row is gone", () => {
  const shell = readSource("../../app/session/[id]/SessionOfflineShell.tsx");

  assert.match(shell, /<TodayExerciseRows/);
  assert.match(shell, /surface="current-session"/);
  assert.doesNotMatch(shell, /PlannedExerciseSummaryRow/);
});

test("the session-cards dev gallery is covered by the shared dev-route guard and holds no server credentials", () => {
  const page = readSource("../../app/dev/session-cards/page.tsx");
  const gallery = readSource("../../app/dev/session-cards/SessionCardsGallery.tsx");

  assert.equal(isDevOnlyPath("/dev/session-cards"), true);
  assert.match(page, /export default function DevSessionCardsPage\(\) \{\s*assertDevPageAvailable\(\);/);
  for (const source of [page, gallery]) {
    assert.doesNotMatch(source, /supabaseAdmin|createSupabase|service[-_ ]role|process\.env/i);
  }
  assert.match(page, /robots:[\s\S]*index: false/);
});

test("finish minutes are whole minutes floored like History (2670s is 44, not 45)", () => {
  assert.equal(getDurationWholeMinutes(2670), 44);
  assert.equal(getDurationWholeMinutes(59), 0);
  assert.equal(getDurationWholeMinutes(60), 1);
  assert.equal(getDurationWholeMinutes(-5), 0);
  assert.equal(getDurationWholeMinutes(Number.NaN), 0);
  const facts = buildSessionFinishedFacts({ exercises: [{ loggedSetCount: 2, isSkipped: false }], durationSeconds: 2670 });
  assert.deepEqual(facts, ["1 exercise", "2 sets", "44 min"]);
});

test("finish card data source: the live set counts of SessionExerciseFocus (queued sets included), not the server render snapshot", () => {
  const focus = readSource("../SessionExerciseFocus.tsx");
  const page = readSource("../SessionPageClient.tsx");

  // The ref is a read-only mirror written by an effect from the same state the rows render from.
  assert.match(focus, /liveProgressRef\.current = exercises\.map\(\(exercise\) => \(\{\s*loggedSetCount: setSnapshotsBySessionExerciseId\[exercise\.id\]\?\.length/);
  assert.match(focus, /isSkipped: rowClientStateBySessionExerciseId\[exercise\.id\]\?\.isSkipped \?\? exercise\.isSkipped/);
  assert.equal((focus.match(/liveProgressRef\.current/g) ?? []).length, 1, "written once, never read back by the logger");
  // The page reads it for the finish card; a session opened already completed falls back to the server rows.
  assert.match(page, /const liveProgressRef = useRef<SessionFinishedExercise\[\] \| null>\(null\)/);
  assert.match(page, /buildSessionFinishedFacts\(\{ exercises: liveProgressRef\.current \?\? exercises, durationSeconds \}\)/);
  assert.match(page, /liveProgressRef=\{liveProgressRef\}/);
});

test("hidden rows: a skipped exercise with nothing logged shows no progress bar; the density clip is gone", () => {
  const focus = readSource("../SessionExerciseFocus.tsx");

  assert.match(focus, /progress=\{buildTodayExerciseLoggedProgress\(progressState, baseRowViewModel\.isSkipped\)\}/);
  assert.doesNotMatch(focus, /max-h-\[48rem\]|max-h-\[240rem\]|max-h-72/);
});

test("quick-log row announces a pending save through an always-mounted polite status region", () => {
  const idle = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.match(idle, /<span role="status" aria-live="polite" class="sr-only"><\/span>/);

  const adding = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={{ ...baseRowContract, isQuickLogPending: true }} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.match(adding, /aria-live="polite" class="sr-only">Adding set to Zed Press</);
  const saving = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={{ ...baseRowContract, isSkipPending: true }} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.match(saving, />Saving Zed Press</);
  assert.doesNotMatch(readSource("./SessionRowCards.tsx"), /testId/);
});

test("feedback prompt starts as one 44px row with a Rate toggle; the grid opens on demand and an existing answer opens it", () => {
  const noop = () => new Promise<never>(() => {});
  const closed = renderToStaticMarkup(
    <SessionExerciseFeedbackPrompt sessionId="s" sessionExerciseId="e" initialFeedback={{ signal: null, note: null, effort: null }} updateFeedbackAction={noop} onSaved={() => {}} />,
  );
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, />Rate</);
  assert.doesNotMatch(closed, /Effort 1 out of 10/);
  assert.doesNotMatch(closed, /Feedback note/);

  const open = renderToStaticMarkup(
    <SessionExerciseFeedbackPrompt sessionId="s" sessionExerciseId="e" initialFeedback={{ signal: null, note: null, effort: 7 }} updateFeedbackAction={noop} onSaved={() => {}} />,
  );
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, />Hide</);
  assert.match(open, /aria-label="Effort 10 out of 10"/);
  assert.match(open, /aria-label="Feedback note \(optional\)"/);
});

test("offline session list has no info control (it needs the network) and no session-exercise id is passed as an exercise id", () => {
  const html = renderToStaticMarkup(
    <TodayExerciseRows
      exercises={[{ id: "session-ex-1", name: "Zed Press", targets: "4 sets", loggedSetCount: 1, targetSetsMin: 4, targetSetsMax: 4 }]}
      emptyMessage="none"
      surface="current-session"
      showInfo={false}
    />,
  );
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /Open exercise info/);
  const shell = readSource("../../app/session/[id]/SessionOfflineShell.tsx");
  assert.match(shell, /showInfo=\{false\}/);
  assert.doesNotMatch(shell, /exerciseId \?\? exercise\.id/);
});
