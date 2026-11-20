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
});
