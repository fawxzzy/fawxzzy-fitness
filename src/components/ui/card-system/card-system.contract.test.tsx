import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { isDevOnlyPath } from "../../../lib/dev-route-guard.ts";
import {
  CardActionRow,
  CardChip,
  CardEmptyState,
  CardHeader,
  CardInfoButton,
  CardLiveRegion,
  CardReorderHint,
  closeCardActionsOnEscape,
  formatReorderAnnouncement,
  CardMeta,
  CardStatusChip,
  CardSurface,
  DragHandle,
  StatBlock,
  cardStatusChips,
  cardTokens,
} from "./index";

const here = new URL("./", import.meta.url);

function read(name: string) {
  return readFileSync(new URL(name, here), "utf8");
}

function render(node: React.ReactElement) {
  return renderToStaticMarkup(node);
}

test("CardSurface is the one surface: theme radius through the glass variable, a rail, a tone attribute", () => {
  const html = render(<CardSurface tone="current">body</CardSurface>);

  assert.match(html, /data-card-surface="true"/);
  assert.match(html, /data-card-tone="current"/);
  assert.match(html, /data-card-rail="true"/);
  assert.match(html, /\[--glass-radius:var\(--card-radius\)\]/);
  assert.doesNotMatch(html, /rounded-\[\d/);
  assert.match(render(<CardSurface empty showRail={false}>x</CardSurface>), /border-dashed/);
  assert.doesNotMatch(render(<CardSurface showRail={false}>x</CardSurface>), /data-card-rail/);
});

test("CardHeader renders a real heading (level configurable) and no button for a static card", () => {
  const html = render(<CardHeader title="Push" />);
  assert.match(html, /<h3[^>]*data-card-title="true"[^>]*>Push<\/h3>/);
  assert.doesNotMatch(html, /<button/);
  assert.match(render(<CardHeader title="Push" headingLevel={2} />), /<h2[^>]*>Push<\/h2>/);
});

test("CardHeader press/toggle/select interactions are one labelled stretched button with the right ARIA state", () => {
  const meta = <CardMeta items={["Day 2", "Tue"]} />;
  const press = render(<CardHeader title="Push" meta={meta} interaction={{ kind: "press", onPress: () => {} }} />);
  const buttonMatch = press.match(/<button[^>]*>/);
  assert.ok(buttonMatch, "press renders a button");
  const titleId = press.match(/<h3 id="([^"]+)"/)?.[1];
  assert.ok(titleId);
  assert.match(buttonMatch[0], new RegExp(`aria-labelledby="${titleId?.replace(/[:]/g, "\\:")}"`));
  assert.match(buttonMatch[0], /aria-describedby="/);
  assert.match(buttonMatch[0], /type="button"/);
  assert.doesNotMatch(buttonMatch[0], /aria-expanded|aria-pressed/);
  assert.match(press, /data-card-affordance="press"/);

  const closed = render(<CardHeader title="Push" interaction={{ kind: "toggle", expanded: false, onToggle: () => {}, controlsId: "panel-1" }} />);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, /aria-controls="panel-1"/);
  assert.doesNotMatch(closed, /rotate-180/);
  const open = render(<CardHeader title="Push" interaction={{ kind: "toggle", expanded: true, onToggle: () => {} }} />);
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /rotate-180/);

  const select = render(<CardHeader title="Push" interaction={{ kind: "select", selected: true, onSelect: () => {} }} />);
  assert.match(select, /aria-pressed="true"/);
  assert.doesNotMatch(select, /data-card-affordance/);
});

test("CardHeader keeps controls out of the hit button (no nested interactive elements) and the chevron decorative", () => {
  const html = render(
    <CardHeader
      title="Push"
      trailing={<DragHandle label="Reorder Push" />}
      interaction={{ kind: "toggle", expanded: false, onToggle: () => {} }}
    />,
  );

  assert.match(html, /<button[^>]*data-card-hit="toggle"[^>]*><\/button>/, "the hit button has no children");
  assert.match(html, /data-card-trailing="true"[^>]*><button[^>]*aria-label="Reorder Push"/);
  assert.match(html, /aria-hidden="true"[^>]*data-card-affordance="toggle"/);
});

test("every standalone card control has a 44px minimum hit area and an accessible name", () => {
  assert.match(cardTokens.iconControl, /min-h-11/);
  assert.match(cardTokens.iconControl, /min-w-11/);
  assert.match(cardTokens.affordance, /h-11/);

  const handle = render(<DragHandle label="Reorder Push" />);
  assert.match(handle, /aria-label="Reorder Push"/);
  assert.match(handle, /title="Drag to reorder"/);
  assert.match(handle, /touch-none/);
  assert.match(handle, /min-h-11/);
  assert.match(render(<CardInfoButton label="Open exercise info for Squat" />), /aria-label="Open exercise info for Squat"[\s\S]*min-h-11/);
});

test("DragHandle gives keyboard users ArrowUp/ArrowDown and passes pointer handlers through", () => {
  const moves: number[] = [];
  const element = DragHandle({ label: "Reorder Push", onMove: (direction) => moves.push(direction) });
  const onKeyDown = element.props.onKeyDown as (event: { key: string; defaultPrevented: boolean; preventDefault: () => void }) => void;
  let prevented = 0;
  const fire = (key: string) => onKeyDown({ key, defaultPrevented: false, preventDefault: () => { prevented += 1; } });

  fire("ArrowUp");
  fire("ArrowDown");
  fire("Enter");
  assert.deepEqual(moves, [-1, 1]);
  assert.equal(prevented, 2);

  const onPointerDown = () => {};
  assert.equal(DragHandle({ label: "x", onPointerDown }).props.onPointerDown, onPointerDown);
});

test("CardActionRow is a labelled group of 44px actions in the given order, with intent exposed", () => {
  const html = render(
    <CardActionRow
      label="Actions for Push"
      actions={[
        { key: "delete", label: "Delete", intent: "danger", onPress: () => {} },
        { key: "edit", label: "Edit", intent: "primary", onPress: () => {} },
      ]}
    />,
  );

  assert.match(html, /role="group"[^>]*aria-label="Actions for Push"/);
  assert.ok(html.indexOf("Delete") < html.indexOf("Edit"), "destructive first, primary last");
  assert.equal((html.match(/!h-11/g) ?? []).length, 2);
  assert.match(html, /data-bottom-action-intent="danger"/);
  assert.match(html, /data-bottom-action-intent="positive"/);
  assert.equal(render(<CardActionRow actions={[]} />), "");
});

test("status chips always carry text; DONE and SKIPPED add a glyph; vocabulary is fixed", () => {
  assert.deepEqual(Object.keys(cardStatusChips), ["active", "today", "inSession", "done", "skipped", "rest", "optional", "selected"]);
  assert.match(render(<CardStatusChip status="done" />), /✓[\s\S]*Done/);
  assert.match(render(<CardStatusChip status="skipped" />), /⊘[\s\S]*Skipped/);
  assert.match(render(<CardStatusChip status="rest" />), /Rest/);
  assert.match(render(<CardChip tone="danger">Failed</CardChip>), /data-card-chip="danger"/);
});

test("CardMeta joins facts with decorative middle dots and drops empty items; StatBlock keeps label and value associated", () => {
  const meta = render(<CardMeta items={["Day 2", null, "Tue", "", "3 strength"]} />);
  assert.equal((meta.match(/aria-hidden="true"/g) ?? []).length, 2);
  assert.match(meta, /Day 2[\s\S]*Tue[\s\S]*3 strength/);
  assert.equal(render(<CardMeta items={[null, false]} />), "");

  const stat = render(<StatBlock label="Target" values={["4 sets", "5 reps"]} />);
  assert.match(stat, /<dl[^>]*><dt[^>]*>Target<\/dt><dd/);
  assert.equal(render(<StatBlock label="Target" values={[]} />), "");
});

test("CardEmptyState is a dashed card with a heading, plain body text and an optional action", () => {
  const html = render(<CardEmptyState title="No routines yet" body="Create one." action={<button type="button">Create</button>} />);
  assert.match(html, /data-card-empty="true"/);
  assert.match(html, /border-dashed/);
  assert.match(html, /<h2[^>]*>No routines yet<\/h2>/);
  assert.match(html, /<button type="button">Create<\/button>/);
});

test("card-system source never sets a text size under 11px, never scrolls sideways and never hard-codes a radius", () => {
  const files = readdirSync(here).filter((name) => /\.(ts|tsx)$/.test(name) && !name.includes(".test."));
  assert.ok(files.length >= 8);

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /text-\[(?:[0-9]|10)(?:\.\d+)?px\]/, `${file}: text under 11px`);
    assert.doesNotMatch(source, /text-\[0\.[0-6]\d*rem\]/, `${file}: text under ~11px`);
    assert.doesNotMatch(source, /overflow-x-(?:auto|scroll)|HorizontalScrollHint/, `${file}: sideways scroll`);
    assert.doesNotMatch(source, /rounded-\[\d/, `${file}: hard-coded radius`);
  }
});

test("only the two documented controls restate button chrome with !; global button CSS is unlayered", () => {
  const tokens = read("cardTokens.ts");
  const importantUtilities = tokens.match(/!(?:bg|border|text)[\w\-[\]./()#,%]*/g) ?? [];

  assert.ok(importantUtilities.length > 0, "the override is intentional, not accidental");
  assert.match(tokens, /global `button` rule in globals\.css is unlayered/);
  for (const file of readdirSync(here).filter((name) => /\.tsx$/.test(name) && !name.includes(".test."))) {
    assert.doesNotMatch(read(file), /className="[^"]*!(?:bg|border|text)-/, `${file}: component-level ! override; add it to cardTokens instead`);
  }
});

test("the card-system dev gallery is covered by the shared dev-route guard and holds no server credentials", () => {
  const page = readFileSync(new URL("../../../app/dev/card-system/page.tsx", import.meta.url), "utf8");
  const gallery = readFileSync(new URL("../../../app/dev/card-system/CardSystemGallery.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../../app/dev/layout.tsx", import.meta.url), "utf8");

  // Withdrawn from production by middleware (isDevOnlyPath) and by the page's own first statement; the layout repeats it.
  assert.equal(isDevOnlyPath("/dev/card-system"), true);
  assert.match(layout, /assertDevPageAvailable\(\)/);
  assert.match(page, /export default function DevCardSystemPage\(\) \{\s*assertDevPageAvailable\(\);/);
  for (const source of [page, gallery]) {
    assert.doesNotMatch(source, /supabaseAdmin|createSupabase|service[-_ ]role|process\.env/i);
  }
  assert.doesNotMatch(page, /HISTORY_QA_PREVIEW_ENABLED/);
  assert.match(page, /robots:[\s\S]*index: false/);
});

type KeyEventLike = { key: string; defaultPrevented: boolean; preventDefault: () => void; stopPropagation: () => void };

function keyEvent(key: string) {
  const event: KeyEventLike = { key, defaultPrevented: false, preventDefault() { event.defaultPrevented = true; }, stopPropagation() {} };
  return event;
}

test("DragHandle: Arrow keys request a one-step move, and aria-disabled (not disabled) blocks it so focus is never dropped", () => {
  const moves: number[] = [];
  const enabled = DragHandle({ label: "Reorder Push", onMove: (direction) => moves.push(direction) });
  const onKeyDown = enabled.props.onKeyDown as (event: KeyEventLike) => void;
  onKeyDown(keyEvent("ArrowUp"));
  onKeyDown(keyEvent("ArrowDown"));
  onKeyDown(keyEvent("Enter"));
  assert.deepEqual(moves, [-1, 1]);

  const blocked: number[] = [];
  const busy = DragHandle({ label: "Reorder Push", "aria-disabled": true, onMove: (direction) => blocked.push(direction) });
  (busy.props.onKeyDown as (event: KeyEventLike) => void)(keyEvent("ArrowDown"));
  assert.deepEqual(blocked, []);
  assert.equal(busy.props.disabled, undefined, "the handle stays focusable while a reorder saves");
  assert.equal(busy.props["aria-disabled"], true);
});

test("reorder hint and live region: polite status that always exists, announcing the new position", () => {
  const hint = render(<CardReorderHint id="hint-1" noun="day" />);
  assert.match(hint, /id="hint-1"/);
  assert.match(hint, /Arrow Up or Arrow Down to move this day/);

  const live = render(<CardLiveRegion message="" />);
  assert.match(live, /role="status"/);
  assert.match(live, /aria-live="polite"/);
  assert.match(render(<CardLiveRegion message="Push moved to position 2 of 5" />), />Push moved to position 2 of 5</);
  assert.equal(formatReorderAnnouncement({ name: "Push", position: 2, total: 5 }), "Push moved to position 2 of 5");
});

test("Escape closes an open card action row and focuses the control that opened it; closed rows ignore Escape", () => {
  let closed = 0;
  let focused = 0;
  const currentTarget = { querySelector: (selector: string) => (selector.includes("aria-expanded") ? { focus: () => { focused += 1; } } : null) };
  const open = Object.assign(keyEvent("Escape"), { currentTarget });
  closeCardActionsOnEscape(open as never, true, () => { closed += 1; });
  assert.deepEqual([closed, focused, open.defaultPrevented], [1, 1, true]);

  closeCardActionsOnEscape({ ...keyEvent("Escape"), currentTarget } as never, false, () => { closed += 1; });
  closeCardActionsOnEscape({ ...keyEvent("a"), currentTarget } as never, true, () => { closed += 1; });
  assert.equal(closed, 1);
});

test("reorder wiring: day list and edit-day list announce moves, describe the handle, keep focus (aria-disabled) and never queue concurrent saves", () => {
  const home = readFileSync(new URL("../../../app/routines/RoutineHomeClient.tsx", import.meta.url), "utf8");
  const edit = readFileSync(new URL("../../../app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(home, /disabled=\{isReorderPending\}/);
  assert.match(home, /aria-disabled=\{isReorderPending \|\| undefined\}/);
  assert.match(home, /<CardLiveRegion message=\{reorderAnnouncement\} \/>/);
  assert.match(home, /aria-describedby=\{REORDER_HINT_ID\}/);

  assert.match(edit, /<CardLiveRegion message=\{reorderAnnouncement\} \/>/);
  assert.match(edit, /aria-describedby=\{EDIT_DAY_REORDER_HINT_ID\}/);
  assert.match(edit, /aria-disabled=\{isReorderSaving \|\| undefined\}/);
  assert.match(edit, /if \(reorderSavingRef\.current \|\| workoutPlanDecisionOpen\) return;/);
  assert.match(edit, /finally \{\s*setReorderSaving\(false\);/);
  assert.match(edit, /setReorderAnnouncement\("Could not reorder exercises; order restored"\)/);
  assert.match(home, /setReorderAnnouncement\("Could not reorder days; order restored"\)/);
  assert.match(home, /name: heading\.title/);
});

test("the Today day picker keeps list semantics: each picker card is an li inside the ul", () => {
  const picker = readFileSync(new URL("../../../app/today/TodayDayPicker.tsx", import.meta.url), "utf8");
  const list = picker.slice(picker.indexOf("<DayList"), picker.indexOf("</DayList>"));

  assert.match(list, /<RoutineOverviewDayCard[\s\S]*?asListItem/);
});
