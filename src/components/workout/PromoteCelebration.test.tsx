import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PromoteCelebrationDialog, formatPromoteStatDelta } from "./PromoteCelebration.tsx";

test("formatPromoteStatDelta: numbers, units and clocks; null when unchanged or not comparable", () => {
  assert.equal(formatPromoteStatDelta("8", "9"), "+1");
  assert.equal(formatPromoteStatDelta("60 kg", "62.5 kg"), "+2.5 kg");
  assert.equal(formatPromoteStatDelta("225 lbs", "220 lbs"), "−5 lbs");
  assert.equal(formatPromoteStatDelta("18:00", "18:30"), "+0:30");
  assert.equal(formatPromoteStatDelta("0:45", "1:00"), "+0:15");
  assert.equal(formatPromoteStatDelta("3", "3"), null);
  assert.equal(formatPromoteStatDelta("60 kg", "135 lbs"), null, "different units are not compared");
  assert.equal(formatPromoteStatDelta("8–10", "10–12"), null, "ranges are not compared");
  assert.equal(formatPromoteStatDelta("Bodyweight", "10 lbs"), null);
});

test("celebration dialog: labelled modal, old -> new rows, changed rows marked, 44px Continue, motion off under reduced motion", () => {
  const html = renderToStaticMarkup(
    <PromoteCelebrationDialog
      titleId="t1"
      exerciseName="Back Squat"
      rows={[{ label: "Reps", from: "8", to: "9" }, { label: "Weight", from: "60 kg", to: "60 kg" }]}
      onClose={() => {}}
    />,
  );

  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="t1"/);
  assert.match(html, /<h2 id="t1"[^>]*>Back Squat<\/h2>/);
  assert.match(html, /Progression up/);
  assert.match(html, /data-promote-row="Reps"[\s\S]*?>8<\/span>[\s\S]*?<span class="sr-only">to<\/span><span[^>]*>9<\/span><span data-promote-delta="true"[^>]*>\+1<\/span>/);
  const weight = html.slice(html.indexOf('data-promote-row="Weight"'));
  assert.doesNotMatch(weight.slice(0, weight.indexOf("</dd>")), /data-promote-delta/, "unchanged row has no badge");
  assert.match(html, /data-promote-close="true" class="[^"]*min-h-11/);
  assert.match(html, /animate-promote-rise motion-reduce:animate-none/);
  assert.match(html, /animate-exercise-glint[^"]*motion-reduce:hidden/);
  assert.match(html, /data-promote-phase="done"/);
  assert.doesNotMatch(html, /data-promote-confirm/);
});

test("confirm phase: 'Ready to promote', Not now + Promote, linked chooser slot; pending reads Promoting... and is aria-disabled", () => {
  const render = (extra: { pending?: boolean; confirmDisabled?: boolean }) => renderToStaticMarkup(
    <PromoteCelebrationDialog
      titleId="t2"
      phase="confirm"
      exerciseName="Back Squat"
      rows={[{ label: "Weight", from: "225 lbs", to: "230 lbs" }]}
      onClose={() => {}}
      onConfirm={() => {}}
      {...extra}
    >
      <p data-linked-chooser="true">Apply to</p>
    </PromoteCelebrationDialog>,
  );

  const idle = render({});
  assert.match(idle, /data-promote-phase="confirm"/);
  assert.match(idle, /Ready to promote/);
  assert.doesNotMatch(idle, /Progression up|Continue/);
  assert.match(idle, /data-linked-chooser="true"/);
  assert.match(idle, /data-promote-close="true"[^>]*>Not now</);
  assert.match(idle, /data-promote-confirm="true"[^>]*>Promote</);
  assert.doesNotMatch(idle, /aria-disabled="/);
  assert.match(idle, /\+5 lbs/);

  const pending = render({ pending: true });
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /aria-disabled="true"[^>]*data-promote-confirm="true"[^>]*>Promoting\.\.\.</);
  assert.match(pending, /disabled=""[^>]*data-promote-close="true"/, "Not now cannot close mid-promote");

  assert.match(render({ confirmDisabled: true }), /aria-disabled="true"[^>]*data-promote-confirm="true"[^>]*>Promote</);
  assert.doesNotMatch(idle + pending, /\btarget\b/i);
});
