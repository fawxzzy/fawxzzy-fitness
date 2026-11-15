import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutineChooserOptionCard, RoutineChooserSourceCard, RoutineDuplicateChooserPanel } from "./RoutineChooserMenu";

test("chooser option card: press kind is a heading-3 card with one header button and no aria-pressed/expanded", () => {
  const html = renderToStaticMarkup(<RoutineChooserOptionCard title="Blank day" onPress={() => {}} />);

  assert.match(html, /<h3[^>]*>Blank day<\/h3>/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.doesNotMatch(html, /aria-pressed|aria-expanded/);
});

test("chooser option card: toggle kind exposes aria-expanded; select kind exposes aria-pressed and a SELECTED chip", () => {
  const closed = renderToStaticMarkup(<RoutineChooserOptionCard title="Duplicate day" kind="toggle" onPress={() => {}} />);
  const open = renderToStaticMarkup(<RoutineChooserOptionCard title="Duplicate day" kind="toggle" active onPress={() => {}} />);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(open, /aria-expanded="true"/);

  const picked = renderToStaticMarkup(<RoutineChooserOptionCard title="Push" kind="select" active onPress={() => {}} />);
  assert.match(picked, /aria-pressed="true"/);
  assert.match(picked, /data-card-chip="[^"]*"[^>]*>Selected</i);
});

test("chooser source card and duplicate panel: heading level 3, select semantics, meta line, footer inside the panel", () => {
  const source = renderToStaticMarkup(<RoutineChooserSourceCard title="Atlas Routine" selected onPress={() => {}} meta={["4 days", "1 rest day"]} />);
  assert.match(source, /<h3[^>]*>Atlas Routine<\/h3>/);
  assert.match(source, /aria-pressed="true"/);
  assert.match(source, /4 days[\s\S]*1 rest day/);

  const panel = renderToStaticMarkup(<RoutineDuplicateChooserPanel title="Choose Day" list={<p>list</p>} footer={<p>footer</p>} />);
  assert.match(panel, /<h3[^>]*>Choose Day<\/h3>/);
  assert.match(panel, /list[\s\S]*footer/);
});
