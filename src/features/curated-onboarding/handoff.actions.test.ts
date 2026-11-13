import assert from "node:assert/strict";
import test from "node:test";
import { CURATED_CREATE_FAILED_MESSAGE, CURATED_UNAVAILABLE_MESSAGE } from "./copy.ts";
import {
  getCuratedHandoffActions,
  getCuratedHandoffPresentation,
  isCuratedHandoffBlocked,
} from "./handoff.ts";

test("a blocked screen makes Build manually primary and Edit setup secondary", () => {
  for (const code of ["safety-clearance-required", "guardian-permission-required", "feature-disabled"] as const) {
    const failure = { code, message: "x" };
    assert.equal(isCuratedHandoffBlocked(failure), true, code);
    assert.deepEqual(getCuratedHandoffActions(failure), { primary: "build-manually", secondary: "edit-setup" }, code);
    assert.equal(getCuratedHandoffPresentation({ status: "failed", failure }).badge, "Blocked", code);
  }
});

test("ordinary failures keep Edit setup (or Try again for a transient error) as the primary action", () => {
  assert.deepEqual(getCuratedHandoffActions({ code: "no-safe-plan", message: "x" }), { primary: "edit-setup", secondary: "build-manually" });
  assert.deepEqual(getCuratedHandoffActions({ code: "incomplete-intake", message: "x" }), { primary: "edit-setup", secondary: "build-manually" });
  assert.deepEqual(getCuratedHandoffActions({ code: "unavailable", message: "x" }), { primary: "try-again", secondary: "build-manually" });
  assert.equal(isCuratedHandoffBlocked(null), false);
});

test("the guardian block uses referral-only copy with no medical claims", () => {
  const copy = getCuratedHandoffPresentation({
    status: "failed",
    failure: { code: "guardian-permission-required", message: "x" },
  });

  assert.match(copy.title, /parent or guardian/i);
  assert.match(copy.body, /parent or guardian/i);
  assert.doesNotMatch(`${copy.title} ${copy.body}`, /medical|diagnos|injur|condition/i);
  assert.equal(copy.tone, "warning");
});

test("member-facing handoff copy says routine, never plan, and never exposes raw error text", () => {
  const states = [
    getCuratedHandoffPresentation({ status: "queued", failure: null }),
    getCuratedHandoffPresentation({ status: "ready", failure: null }),
    getCuratedHandoffPresentation({ status: "failed", failure: null }),
    getCuratedHandoffPresentation({ status: "not-implemented", failure: null }),
    getCuratedHandoffPresentation({ status: "idle", failure: null }),
    getCuratedHandoffPresentation({ status: "failed", failure: { code: "no-safe-plan", message: "x" } }),
    getCuratedHandoffPresentation({ status: "failed", failure: { code: "safety-clearance-required", message: "x" } }),
    getCuratedHandoffPresentation({ status: "failed", failure: { code: "guardian-permission-required", message: "x" } }),
  ];

  for (const copy of states) {
    assert.doesNotMatch(`${copy.title} ${copy.body}`, /\bplan\b/i);
  }
  for (const message of [CURATED_UNAVAILABLE_MESSAGE, CURATED_CREATE_FAILED_MESSAGE]) {
    assert.doesNotMatch(message, /\bplan\b|constraints|supabase|postgres|exception|error:/i);
    assert.match(message, /build a routine manually/i);
  }
});
