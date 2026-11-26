import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isDevOnlyPath } from "../../lib/dev-route-guard.ts";
import { getDurationWholeMinutes } from "../../lib/duration.ts";
import { SessionExerciseFeedbackPrompt } from "./SessionExerciseFeedbackPrompt.tsx";
import { TodayExerciseRows } from "../../app/today/TodayExerciseRows.tsx";
import {
  formatLoggerSummary,
  LoggedSetDeleteButton,
  LoggerPrimaryLogButton,
  LoggerSecondaryButton,
  LoggerToggleChip,
} from "./SetLoggerControls.tsx";
import { describeLoggerChips, LOGGER_CHIP_CAPTIONS, resolveLoggerLogPrefix } from "./loggerChipCaption.ts";
import {
  buildSessionFinishedDetails,
  buildSessionFinishedFacts,
  SessionCardExpandHandle,
  SessionExerciseRowCard,
  SessionFinishedCard,
  SessionCardBarButton,
  SessionCardMoreMenu,
  SessionHiddenRowCard,
  SessionQuickLogRow,
  SessionRowActionButton,
  getSessionSkipMenuLabel,
  resolveSessionSkippedStatus,
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

test("status (Zac 2026-11-23): no check and no chevron; Skipped and Added sit on the title line; hidden cards keep the thumbnail", () => {
  const done = renderRow(false, { status: "done" });
  assert.doesNotMatch(done, /data-exercise-done-check/);
  assert.doesNotMatch(done, /data-card-chip=/);
  assert.doesNotMatch(done, /data-card-affordance|chevron/i, "no chevron: the whole header is the toggle");
  assert.doesNotMatch(renderRow(false, { status: null }), /data-card-chip=/);

  const added = renderRow(false, { status: "added" });
  assert.match(added, /<h2[^>]*data-card-title="true"[^>]*>[\s\S]*Zed Press[\s\S]*Added[\s\S]*<\/h2>/, "Added is inline with the name");

  const hiddenDone = renderToStaticMarkup(
    <SessionHiddenRowCard exercise={exercise} status="done" progress={null} action={<button type="button">Show</button>} />,
  );
  assert.doesNotMatch(hiddenDone, /data-exercise-done-check|data-card-chip=/);
  assert.match(hiddenDone, /data-exercise-thumb-slot|data-card-leading|<img/, "hidden card keeps the image top right");

  const skipped = renderToStaticMarkup(
    <SessionHiddenRowCard exercise={exercise} status="skipped" progress={null} action={<button type="button">Unskip</button>} />,
  );
  assert.match(skipped, /<h2[^>]*data-card-title="true"[^>]*>[\s\S]*Zed Press[\s\S]*⊘[\s\S]*Skipped[\s\S]*<\/h2>/, "Skipped is on the title line");
  assert.match(skipped, /data-exercise-thumb-slot|data-card-leading|<img/, "skipped card keeps the image top right");
  assert.match(skipped, /data-session-card-bar="true"[\s\S]*Unskip/, "the restore action sits in the card bar");

  // DESIGN (timers-session-cardio): a skipped exercise with sets logged reads Partial, never SKIPPED next to "1/3 sets".
  assert.equal(resolveSessionSkippedStatus(0), "skipped");
  assert.equal(resolveSessionSkippedStatus(1), "partial");
  const partial = renderToStaticMarkup(
    <SessionHiddenRowCard exercise={exercise} status="partial" progress={{ label: "1 / 3 sets", percent: 33 }} action={<button type="button">Unskip</button>} />,
  );
  assert.match(partial, /<h2[^>]*data-card-title="true"[^>]*>[\s\S]*Zed Press[\s\S]*Partial[\s\S]*<\/h2>/);
  assert.doesNotMatch(partial, /Skipped/);
  const focus = readSource("../SessionExerciseFocus.tsx");
  assert.equal((focus.match(/resolveSessionSkippedStatus\(setCount\)/g) ?? []).length, 2, "open card and compact card");
});

test("card bar: More, Log all and Log set in that order, every control a 44px pill inside the card, label-in-name", () => {
  const html = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={3} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  );
  const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];

  assert.equal(buttons.length, 3);
  assert.match(buttons[0], /aria-label="More actions for Zed Press"/);
  assert.match(buttons[0], /aria-haspopup="menu"/, "the shared Menu trigger");
  assert.match(buttons[0], /aria-expanded="false"/);
  assert.match(buttons[1], /aria-label="Log all remaining sets: Zed Press"/);
  assert.match(buttons[1], />Log all</);
  assert.match(buttons[2], />Log set</);
  assert.match(buttons[2], /5 reps · 225 lbs/);
  for (const button of buttons) {
    assert.match(button, /\bh-11\b/, "44px tall");
    assert.match(button, /min-w-11/, "never narrower than 44px");
  }
  assert.doesNotMatch(buttons[2], /promote-shine/, "no shine on the card: the sweep is the logger's primary only");
  assert.match(html, /data-session-card-bar="true" role="group" aria-label="Quick actions for Zed Press"/);
  assert.match(html, /px-3 pb-3 pt-1/, "padded inside the card, not an edge-to-edge strip");
  assert.doesNotMatch(html, /text-\[(9|10)px\]/);
  assert.doesNotMatch(html, />Skip</, "Skip moved into the More menu");
});

test("card bar without remaining sets drops Log all; pending and disabled states use aria-disabled, never native disabled", () => {
  const two = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.equal((two.match(/<button/g) ?? []).length, 2);
  assert.equal((renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={1} rowContract={baseRowContract} onSkip={() => {}} onPress={() => {}} />,
  ).match(/<button/g) ?? []).length, 2, "one remaining set: Log set already does it");

  const pending = renderToStaticMarkup(
    <SessionQuickLogRow
      exerciseName="Zed Press"
      logAllCount={2}
      rowContract={{ ...baseRowContract, isQuickLogPending: true }}
      onSkip={() => {}}
      onPress={() => {}}
    />,
  );
  assert.equal((pending.match(/aria-disabled="true"/g) ?? []).length, 2, "Log all and Log set wait; More stays usable");
  assert.doesNotMatch(pending, /\sdisabled(=|\s|>)/, "focus survives a pending save: no native disabled");
  assert.match(pending, /Adding\.\.\./);

  const blocked = renderToStaticMarkup(
    <SessionQuickLogRow exerciseName="Zed Press" logAllCount={0} rowContract={{ ...baseRowContract, isQuickLogDisabled: true }} onSkip={() => {}} onPress={() => {}} />,
  );
  assert.match(blocked, /Unskip to log/);
});

test("More menu: the shared Menu with Skip/Hide and Remove; Remove asks first and is offered only before any set is logged", () => {
  assert.equal(getSessionSkipMenuLabel("Skip"), "Skip exercise");
  assert.equal(getSessionSkipMenuLabel("Hide"), "Hide exercise");
  const closed = renderToStaticMarkup(
    <SessionCardMoreMenu exerciseName="Zed Press" skipLabel="Skip" isSkipPending={false} skipInactive={false} removeInactive={false} onSkip={() => {}} onRemove={() => {}} />,
  );
  assert.equal((closed.match(/<button/g) ?? []).length, 1, "closed: only the More button renders");
  assert.match(closed, /data-session-more="true"/);

  const rows = readSource("./SessionRowCards.tsx");
  assert.match(closed, /aria-haspopup="menu"/, "the shared Menu trigger, not a hand-rolled sheet");
  assert.match(closed, /aria-label="More actions for Zed Press"/);
  assert.doesNotMatch(rows, /BottomSheet/, "no hand-rolled kebab sheet");
  assert.match(rows, /<Menu\s+label=\{`More actions for \$\{exerciseName\}`\}/);
  assert.match(rows, /id: "skip",\s+label: skipMenuLabel,\s+disabled: skipInactive/, "Skip keeps its named action");
  assert.match(rows, /id: "remove",\s+label: "Remove from workout",\s+tone: "danger" as const/);
  assert.match(rows, /setConfirmRemoveOpen\(true\)/, "Remove opens the confirm, never removes on the first tap");
  assert.match(rows, /<ConfirmDestructiveModal[\s\S]*title=\{`Remove \$\{exerciseName\}\?`\}[\s\S]*cancelLabel="Keep"/);

  const focus = readSource("../SessionExerciseFocus.tsx");
  assert.equal((focus.match(/onRemove=\{canOfferRemove \? \(\) => handleRemoveExercise\(exercise\.id\) : undefined\}/g) ?? []).length, 2, "card bar and expanded logger");
  assert.match(focus, /const canOfferRemove = setCount === 0 && isOnline && !loggerSavingIds\.includes\(exercise\.id\);/, "online, no sets, no save in flight");
  assert.match(focus, /onLogRequestPendingChange=\{\(pending\) => \{\s*handleLoggerSavingChange\(exercise\.id, pending\);/);
  assert.match(focus, /guard\.savingIds\.includes\(exerciseId\) \|\| guardRow\?\.isQuickLogPending/, "the confirm re-checks a save in flight");
  assert.match(focus, /toast\.error\(REMOVE_EXERCISE_HAS_SETS_ERROR\)/, "the confirm re-checks the latest set count");
  assert.match(focus, /Removing an exercise needs a connection\./);
  assert.match(readSource("./SetLoggerCard.tsx"), /onLogRequestPendingChangeRef\.current\?\.\(isLogRequestPending\)/);
  assert.match(focus, /loggerLeadingAction=\{\(\s*<SessionCardMoreMenu/, "the expanded logger has the same More menu");
});

test("Skip / Hide / Unskip hands focus to the swapped card (restore action or More), never drops it to the page", () => {
  const focus = readSource("../SessionExerciseFocus.tsx");
  assert.match(focus, /requestCardFocus\(exerciseId, nextSkipped \? "restore" : "more"\);/, "skip and unskip");
  assert.match(focus, /requestCardFocus\(exerciseId, nextShowWhenCompleted \? "more" : "restore"\);/, "hide and show of a finished exercise");
  assert.match(focus, /buttonProps=\{\{ "data-session-restore": "true" \}\}/, "the compact card's restore action is findable");
  assert.ok(focus.includes(`'[data-session-restore="true"]' : '[data-session-more="true"] [data-menu-trigger]'`));
  assert.match(focus, /active !== document\.body && active\.isConnected && !row\.contains\(active\)/, "never steals focus moved elsewhere");
  assert.match(focus, /SESSION_CARD_FOCUS_HANDOFF_MS/, "a handoff that never renders (rolled back) expires");
});

test("quiet success: show, hide and skip raise no notice; set notices stay; failures still notify", () => {
  const focus = readSource("../SessionExerciseFocus.tsx");
  const timers = readSource("./SetLoggerCard.tsx");
  for (const source of [focus, timers]) {
    assert.doesNotMatch(source, /toast\.success\([^)]*(skipped|hidden|shown|Unskipped|change queued)/i);
  }
  // Zac asked for no toast on show / hide / skip only: the set notices stay.
  assert.match(focus, /toast\.success\("Set logged\."\)/);
  assert.match(timers, /toast\.success\(prToast \? `Set logged\. \$\{prToast\}` : "Set logged\."\)/);
  for (const message of ["Set removed.", "Queued set removed.", "Applied to current set."]) {
    assert.ok(timers.includes(`toast.success("${message}")`), message);
  }
  assert.match(focus, /toast\.error\(result\.error \|\| "Could not update skip state\."\)/);
  assert.match(focus, /toast\.error\(result\.error \|\| "Could not remove exercise\."\)/);
  assert.match(readSource("../SessionPageClient.tsx"), /noticePlacement="above-dock"/, "every workout notice sits in the overlay above the dock, so it never moves a card");
});

test("bar buttons: inactive guards the handler; variants are 44px pills", () => {
  const html = renderToStaticMarkup(<SessionCardBarButton variant="quiet" label="Show" inactive onPress={() => {}} />);
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /\bh-11\b/);
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
  assert.deepEqual(facts, ["2 exercises", "4 sets", "45m"]);
  assert.deepEqual(buildSessionFinishedFacts({ exercises: [{ loggedSetCount: 1, isSkipped: false }], durationSeconds: 59 }), ["1 exercise", "1 set"]);
  assert.deepEqual(buildSessionFinishedFacts({ exercises: [], durationSeconds: 0 }), []);

  const html = renderToStaticMarkup(<SessionFinishedCard facts={facts} />);
  assert.match(html, /role="status"/);
  assert.match(html, /<h2[^>]*>Workout saved<\/h2>/);
  assert.match(html, /2 exercises/);
  assert.match(html, /Saved to History\. Tap Done to go back to Today\./);
  assert.doesNotMatch(html, /data-session-summary-highlights|data-session-summary-rows/, "no details, no empty sections");
  assert.doesNotMatch(renderToStaticMarkup(<SessionFinishedCard facts={[]} />), /data-card-meta/);
});

test("post-workout summary: volume, top set and one line per exercise from the live list; no PR line", () => {
  const details = buildSessionFinishedDetails([
    { loggedSetCount: 2, isSkipped: false, name: "Bench Press", sets: [{ weight: 185, reps: 5, weightUnit: "lbs" }, { weight: 185, reps: 6, weightUnit: "lbs" }] },
    { loggedSetCount: 0, isSkipped: true, name: "Dips", sets: [] },
    { loggedSetCount: 0, isSkipped: false },
  ]);
  const html = renderToStaticMarkup(<SessionFinishedCard facts={["1 exercise", "2 sets"]} details={details} />);
  assert.match(html, /data-session-summary-highlight="volume"[\s\S]*2,035 lbs lifted/);
  assert.match(html, /data-session-summary-highlight="top-set"[\s\S]*185 lbs x 6 · Bench Press/);
  assert.match(html, /data-session-summary-row="done"[\s\S]*Bench Press[\s\S]*2 sets/);
  assert.match(html, /data-session-summary-row="skipped"[\s\S]*Dips[\s\S]*Skipped/);
  assert.doesNotMatch(html, /\bPR\b/);

  const page = readSource("../SessionPageClient.tsx");
  // Saving stays on the summary; Done goes back (navigateReturn), View in History opens this session's detail.
  assert.doesNotMatch(page, /setIsSessionCompleted\(true\);[\s\S]{0,200}navigateReturn\(\);/);
  assert.match(page, /<BottomDockLink href=\{`\/history\/\$\{sessionId\}\?returnTab=sessions`\}[\s\S]{0,80}>\s*View in History\s*<\/BottomDockLink>/);
  assert.match(page, /onClick=\{navigateReturn\}[\s\S]{0,80}>\s*Done\s*<\/BottomDockButton>/);
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
  assert.match(source, /<FormField label="Feedback note \(optional\)"/, "note input is labelled");
  assert.match(source, /className=\{formFieldControlClassName\}/, "note input is the 44px FormField control");
  assert.doesNotMatch(source, /h-6 w-6|h-7 |text-\[(9|10)px\]|overflow-x-auto/);
});

test("set logger (Zac 2026-11-23): toggle chips, quiet secondaries, one Log set primary, trash + confirm, no red inline error", () => {
  const timers = readSource("./SetLoggerCard.tsx");

  assert.doesNotMatch(timers, /<GlowSwitch/, "sliding switches clipped at the card edge; chips replace them");
  assert.equal((timers.match(/<LoggerToggleChip/g) ?? []).length, 3, "Warm-up, Failure, Timer");
  assert.match(timers, /<LoggerPrimaryLogButton/);
  assert.match(timers, /\swrapHorizontalFields\s/, "the logger opts into the wrapping field grid");
  assert.match(timers, /onPress=\{\(\) => setConfirmDeleteSet\(\{ set, index \}\)\}/, "Delete asks first");
  assert.match(timers, /<ConfirmDestructiveModal[\s\S]*confirmActionLabel="Delete"[\s\S]*cancelLabel="Keep"/);
  assert.doesNotMatch(timers, /routineEditorAutosaveErrorText/, "no red error line under the logger");
  assert.match(timers, /data-logger-invalid=\{error \? "true" : undefined\}/, "neutral outline marker while a value is invalid");
  assert.doesNotMatch(timers, /error \? "border-\[rgb\(var\(--danger/);
  assert.match(timers, /setError\(queued \? null : message\)/, "a queued set is not an error");
  assert.doesNotMatch(timers, /!h-6 !min-h-0|gap-1\.5 text-\[10px\] leading-tight/);
  assert.match(timers, /ariaLabel="Failure"/, "the Failure chip's name is just its word");
  assert.doesNotMatch(timers, /Failure target/, "no 'Target' in the logger's names");
});

test("logger controls: 44px chips with aria-pressed, Log set primary with the Promote sweep only while active, 44px trash", () => {
  assert.equal(formatLoggerSummary(["5 reps", " 225 lbs ", ""]), "5 reps · 225 lbs");

  const chip = renderToStaticMarkup(<LoggerToggleChip pressed label="Warm-up" ariaLabel="Warm-up set" onPress={() => {}} />);
  assert.match(chip, /aria-pressed="true"/);
  assert.match(chip, /aria-label="Warm-up set"/);
  assert.match(renderToStaticMarkup(<LoggerToggleChip pressed={false} label="Timer" ariaLabel="Exercise timer" onPress={() => {}} />), /aria-pressed="false"/);
  const timers = readSource("./SetLoggerCard.tsx");
  assert.doesNotMatch(timers, /Active set enabled|target disabled|timer disabled/, "state lives in aria-pressed, not a name that contradicts the visible word");
  assert.match(timers, /const showLogAllAction = remainingTargetSetCount > 1;/, "one remaining set: Log set already does it");
  assert.match(chip, /\bh-11\b/);
  assert.match(chip, />Warm-up</);

  const active = renderToStaticMarkup(<LoggerPrimaryLogButton prefix="Log" summaryItems={["5 reps", "225 lbs"]} inactive={false} onPress={() => {}} />);
  assert.match(active, /promote-shine/);
  assert.match(active, />Log set</);
  assert.match(active, />5 reps · 225 lbs</);
  assert.match(active, /\bh-14\b/);
  const idle = renderToStaticMarkup(<LoggerPrimaryLogButton prefix="Log" summaryItems={[]} inactive onPress={() => {}} />);
  assert.doesNotMatch(idle, /promote-shine/);
  assert.match(idle, /aria-disabled="true"/);

  const secondary = renderToStaticMarkup(<LoggerSecondaryButton onPress={() => {}} inactive>Log all (3)</LoggerSecondaryButton>);
  assert.match(secondary, /\bh-11\b/);
  assert.match(secondary, /aria-disabled="true"/);

  const trash = renderToStaticMarkup(<LoggedSetDeleteButton ariaLabel="Delete set 1" pending={false} inactive={false} onPress={() => {}} />);
  assert.match(trash, /aria-label="Delete set 1"/);
  assert.match(trash, /h-11 w-11/);
  assert.doesNotMatch(trash, /[\s"]!(bg|text)-\[rgb\(var\(--danger-rgb\)/, "quiet at rest: red only on hover/press, not on every logged row");
  assert.doesNotMatch(trash, /\sdisabled(=|\s|>)/);
});

test("measurement panel: wrapHorizontalFields is opt-in and lays fields on a wrapping grid (no clipped steppers)", () => {
  const panel = readSource("../ui/measurements/MeasurementPanelV2.tsx");
  assert.match(panel, /wrapHorizontalFields = false,/, "default keeps the scrolling rail for other callers");
  assert.match(panel, /data-measurement-aux-row="wrap"/);
  assert.match(panel, /data-measurement-field-wrap="true"/);
  assert.ok(panel.includes("grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))]"));
  assert.ok(panel.includes("[&>*:last-child:nth-child(odd)]:col-span-full"), "an odd last field spans the row");
  assert.ok(panel.includes("min-w-0 [&>*]:!min-h-0"), "fields may shrink: no fixed rail width");
  // The min-h-0 override reaches only each field's wrapper (direct child), never the steppers: they keep a fixed
  // !h-11 !w-11 (44px, measured at 320 and 390 in chrome on the logger fixtures, 2026-11-23).
  assert.doesNotMatch(panel, /\[&_[^\]]*\]:!?min-h-0|\[&_button\]:!?h-(?:[0-9]|10)\b/, "no descendant-wide min-h-0 or smaller button height");
  assert.equal((panel.match(/className="!(?:left|right)-0 !h-11 !w-11 z-20"/g) ?? []).length, 2, "both steppers stay 44x44");
});

test("add-exercise dock: the goal fields wrap instead of scrolling sideways, so no stepper is clipped at 320 or 390", () => {
  const picker = readSource("../ExercisePicker.tsx");
  const shared = readSource("../ui/measurements/SharedExerciseGoalForm.tsx");
  const goal = readSource("../ui/measurements/ExerciseGoalForm.tsx");
  const configurator = readSource("../ui/measurements/MeasurementConfigurator.tsx");

  assert.match(picker, /<SharedExerciseGoalForm[\s\S]*?wrapMeasurementFields[\s\S]*?\/>/, "the picker dock opts into the wrapping field grid");
  assert.match(shared, /wrapMeasurementFields=\{wrapMeasurementFields\}/, "shared form forwards it");
  assert.match(goal, /wrapHorizontalFields=\{wrapMeasurementFields\}/, "goal form hands it to the configurator");
  assert.match(configurator, /wrapHorizontalFields=\{wrapHorizontalFields\}/, "configurator hands it to the panel");
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
  assert.match(page, /export default async function DevSessionCardsPage\(\) \{\s*await assertDevPageAvailable\(\);/);
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
  assert.deepEqual(facts, ["1 exercise", "2 sets", "44m"]);
  assert.deepEqual(
    buildSessionFinishedFacts({ exercises: [{ loggedSetCount: 2, isSkipped: false }], durationSeconds: 4500 }),
    ["1 exercise", "2 sets", "1h 15m"],
    "long sessions read like History, not 75 min",
  );
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
  assert.match(open, /<label[^>]*>Feedback note \(optional\)<\/label>/);
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

test("offline shell: a cached finished workout shows Back, not Pause (2026-11-24 review)", () => {
  const shell = readSource("../../app/session/[id]/SessionOfflineShell.tsx");
  assert.match(shell, /completed=\{cachedSnapshot\?\.completed === true\}/, "the header gets the cached completion");
  const page = readSource("../../app/session/[id]/page.tsx");
  assert.match(page, /completed: sessionRow\.status === "completed"/, "the snapshot records completion when it is cached");
});

test("open / close (Zac 2026-11-24): bottom-edge grab handle that flips, Close at the top of the open logger, no chevron", () => {
  const collapsed = renderRow(false);
  const handle = collapsed.match(/<button[^>]*data-session-expand-handle="true"[^>]*>/)?.[0];
  assert.ok(handle, "the collapsed card has the grab handle");
  assert.match(handle, /aria-expanded="false"/);
  assert.match(handle, /aria-controls="session-exercise-panel-se-1"/);
  assert.match(handle, /aria-label="Open Zed Press logger"/);
  assert.match(handle, /before:h-11/, "44px tall target");
  // A centred 44px area reached 12px up into Log set / Log all (real-browser elementFromPoint, 2026-11-24): grow it down.
  assert.match(handle, /before:-top-1/, "the target starts at the bar's bottom edge and grows down");
  assert.doesNotMatch(handle, /before:top-1\/2/, "not centred on the pill");
  assert.match(handle, /\bw-16\b/, "64px wide target");
  assert.match(collapsed, /data-session-expand-handle-direction="down"/);
  assert.ok(collapsed.indexOf("footer-stub") < collapsed.indexOf("data-session-expand-handle="), "the handle is on the bottom edge, after the bar");
  assert.doesNotMatch(collapsed, /data-session-logger-close/);

  // 16px under the pill: the 44px target ends 3px into the 8px card gap, never under the next card (2026-11-24 review;
  // with pb-1 the next card took the bottom 8px, measured with elementFromPoint at 390 and 320).
  assert.match(collapsed, /data-session-expand-handle-row="true" class="[^"]*\bpb-4\b/, "room under the handle for its target");

  const expanded = renderRow(true);
  const openHandle = expanded.match(/<button[^>]*data-session-expand-handle="true"[^>]*>/)?.[0];
  assert.ok(openHandle);
  assert.match(openHandle, /aria-expanded="true"/);
  assert.match(openHandle, /aria-label="Collapse Zed Press logger"/, "never the same name as the Close button");
  assert.match(expanded, /data-session-expand-handle-direction="up"[^>]*rotate-180/, "flips to point up while open");
  const close = expanded.match(/<button[^>]*data-session-logger-close="true"[^>]*>Close<\/button>/)?.[0];
  assert.ok(close, "Close is a visible text control");
  assert.match(close, /aria-expanded="true"/);
  assert.match(close, /\bh-11\b/);
  assert.match(close, /aria-label="Close Zed Press logger"/, "label in name");
  assert.ok(expanded.indexOf("data-session-logger-close=") < expanded.indexOf("logger-stub"), "Close sits above the logger");
  for (const html of [collapsed, expanded]) {
    assert.doesNotMatch(html, /data-card-affordance|chevron|data-exercise-done-check/i, "still no chevron or check on the card");
  }

  let toggles = 0;
  const handleOnly = renderToStaticMarkup(<SessionCardExpandHandle expanded={false} controlsId="p" exerciseName="Zed Press" onToggle={() => { toggles += 1; }} />);
  assert.match(handleOnly, /type="button"/);
  assert.equal(toggles, 0);
  assert.match(readSource("../SessionExerciseFocus.tsx"), /onToggle=\{\(\) => toggleExercise\(exercise\.id\)\}/, "header, handle and Close share the one toggle");
});

test("logger chips (Zac 2026-11-24): a plain caption for the pressed chip(s) and a Log set label that names the set", () => {
  const base = { warmup: false, failure: false, timer: false, hasMarkChips: true };
  assert.equal(describeLoggerChips(base), "Tap a chip to mark the next set");
  assert.equal(describeLoggerChips({ ...base, warmup: true }), "Warm-up: not counted for progression");
  assert.equal(describeLoggerChips({ ...base, failure: true }), "Failure: a tag only. Enter reps reached");
  assert.equal(describeLoggerChips({ ...base, timer: true }), "Timer: shown on this card");
  assert.equal(describeLoggerChips({ ...base, warmup: true, timer: true }), "Warm-up: not counted for progression", "the mark only, so it stays one line");
  assert.equal(describeLoggerChips({ ...base, hasMarkChips: false }), null, "nothing to say on a timer-only logger with the timer off");
  for (const caption of Object.values(LOGGER_CHIP_CAPTIONS)) {
    assert.doesNotMatch(caption, /target/i, "never the word Target");
    assert.ok(caption.length <= 40, `fits one line at 320px: ${caption}`);
  }
  assert.equal(resolveLoggerLogPrefix({ warmup: true, failure: false }), "Log warm-up set");
  assert.equal(resolveLoggerLogPrefix({ warmup: false, failure: true }), "Log failure set");
  assert.equal(resolveLoggerLogPrefix({ warmup: false, failure: false }), "Log");
  assert.match(renderToStaticMarkup(<LoggerPrimaryLogButton prefix="Log warm-up set" summaryItems={["5 reps"]} inactive={false} onPress={() => {}} />), /Log warm-up set/);

  const timers = readSource("./SetLoggerCard.tsx");
  assert.match(timers, /resolveLoggerLogPrefix\(\{ warmup: resolvedIsWarmup, failure: resolvedIsFailure \}\)/);
  assert.match(timers, /auxiliaryCaption=\{loggerChipCaption \?/, "the caption renders directly under the chip row");
  const panel = readSource("../ui/measurements/MeasurementPanelV2.tsx");
  assert.ok(panel.indexOf('data-measurement-aux-row="wrap"') < panel.indexOf('data-measurement-aux-caption="true"'), "caption after the chip row");
  assert.ok(panel.indexOf('data-measurement-aux-caption="true"') < panel.indexOf('data-measurement-field-wrap="true"'), "and before the fields");
  // The verified data rules the caption relies on: progression skips warm-ups; nothing reads the failure marker.
  assert.match(readSource("../../lib/progression-progress-percent.ts"), /filter\(\(row\) => !row\.isWarmup\)/);
});
