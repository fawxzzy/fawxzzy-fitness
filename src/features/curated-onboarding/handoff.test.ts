import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_MANUAL_ROUTINE_HREF,
  getCuratedHandoffPresentation,
  isCuratedHandoffRetryable,
} from "./handoff.ts";

test("the manual fallback is the same destination as the Routines screen Build manually option", () => {
  assert.equal(CURATED_MANUAL_ROUTINE_HREF, "/routines/new?mode=blank");
});

test("a safety block never reads as a generic failure and never offers an unchanged retry", () => {
  const failure = { code: "safety-clearance-required", message: "x" } as const;
  const copy = getCuratedHandoffPresentation({ status: "failed", failure });

  assert.equal(copy.badge, "Blocked");
  assert.equal(copy.tone, "warning");
  assert.match(copy.title, /professional/i);
  assert.match(copy.body, /build your own routine/i);
  assert.equal(isCuratedHandoffRetryable(failure), false);
});

test("only a transient server error is retryable; setup problems point to edit or manual", () => {
  const unavailable = { code: "unavailable", message: "x" } as const;
  assert.equal(isCuratedHandoffRetryable(unavailable), true);
  assert.match(getCuratedHandoffPresentation({ status: "failed", failure: unavailable }).body, /Try again/);

  for (const code of ["no-safe-plan", "incomplete-intake", "invalid-request"] as const) {
    const failure = { code, message: "x" };
    assert.equal(isCuratedHandoffRetryable(failure), false, code);
    const copy = getCuratedHandoffPresentation({ status: "failed", failure });
    assert.equal(copy.badge, "Failed");
    assert.match(copy.body, /Edit your setup, or build a routine manually/);
  }
  assert.equal(isCuratedHandoffRetryable(null), false);
});

test("every generation status has explicit copy and none pretends a routine exists before it does", () => {
  assert.equal(getCuratedHandoffPresentation({ status: "queued", failure: null }).badge, "Working");
  assert.equal(getCuratedHandoffPresentation({ status: "ready", failure: null }).badge, "Ready");
  assert.equal(getCuratedHandoffPresentation({ status: "failed", failure: null }).badge, "Failed");
  assert.match(getCuratedHandoffPresentation({ status: "not-implemented", failure: null }).body, /manually/i);
  assert.match(getCuratedHandoffPresentation({ status: "idle", failure: null }).title, /saved on this device/i);
});
