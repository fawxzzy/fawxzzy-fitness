import test from "node:test";
import assert from "node:assert/strict";

import { isSafeAppPath, resolvePreferredReturnHref, resolveReturnHref } from "./navigation-return.ts";
import {
  getRoutineDayEditHref,
  getRoutineEditHref,
  resolveRoutineDayViewBackHref,
  resolveRoutineEditBackHref,
} from "./routine-day-navigation.ts";
import { resolveAccountReturnHref } from "./account-navigation.ts";
import { getExerciseInfoHref } from "./exercise-nav.ts";

// Every value here must be refused: each one either leaves the app origin in a browser
// (`new URL(v, origin)` or a later decodeURIComponent turns it into another host/scheme) or is not a path.
const BAD_RETURN_TO: Array<[label: string, value: string | null | undefined]> = [
  ["backslash host", "/\\evil.com"],
  ["encoded backslash", "/%5Cevil.com"],
  ["lower-case encoded backslash", "/%5cevil.com"],
  ["tab before slash", "/\t/evil.com"],
  ["encoded tab before slash", "/%09/evil.com"],
  ["newline before slash", "/\n/evil.com"],
  ["carriage return before slash", "/\r/evil.com"],
  ["encoded newline", "/%0A/evil.com"],
  ["encoded carriage return", "/%0D/evil.com"],
  ["NUL", "/\u0000/evil.com"],
  ["DEL", "/\u007f/evil.com"],
  ["protocol-relative", "//evil.com"],
  ["protocol-relative with path", "//evil.com/today"],
  ["encoded protocol-relative after slash", "/%2F/evil.com"],
  ["encoded protocol-relative after slash (upper/lower)", "/%2f%2fevil.com"],
  ["double-encoded slashes", "%252F%252Fevil.com"],
  ["double-encoded slashes after slash", "/%252F/evil.com"],
  ["triple-encoded backslash", "/%25255Cevil.com"],
  ["absolute https URL", "https://x"],
  ["absolute http URL", "http://evil.com/today"],
  ["javascript scheme", "javascript:alert(1)"],
  ["javascript scheme upper-case", "JAVASCRIPT:alert(1)"],
  ["data scheme", "data:text/html,hi"],
  ["leading space", " /today"],
  ["space then slash", "/ /evil.com"],
  ["no-break space", `/${String.fromCharCode(0xa0)}/evil.com`],
  ["ideographic space", `/${String.fromCharCode(0x3000)}/evil.com`],
  ["line separator", `/${String.fromCharCode(0x2028)}/evil.com`],
  ["zero-width space", `/${String.fromCharCode(0x200b)}/evil.com`],
  ["BOM", `/${String.fromCharCode(0xfeff)}/evil.com`],
  ["encoded no-break space", "/%C2%A0/evil.com"],
  ["dot segment to protocol-relative path", "/.//evil.com"],
  ["malformed percent escape", "/today%"],
  ["relative path", "today"],
  ["empty string", ""],
  ["null", null],
  ["undefined", undefined],
];

const GOOD_RETURN_TO = [
  "/",
  "/today",
  "/routines",
  "/routines/abc-123/edit",
  "/routines/abc-123/edit?x=1",
  "/routines/abc-123/edit/day/day-2?returnTo=%2Ftoday",
  "/session/abc?returnTo=%2Froutines%2F1%2Fedit%3FreturnTo%3D%252Ftoday",
  "/history?q=bench%20press",
  "/settings#privacy",
  "/today?tab=plan#top",
  "/exercises/bench-press",
];

for (const [label, value] of BAD_RETURN_TO) {
  test(`isSafeAppPath rejects ${label}`, () => {
    assert.equal(isSafeAppPath(value), false, JSON.stringify(value));
    assert.equal(resolveReturnHref(value, "/fallback"), "/fallback");
  });
}

for (const value of GOOD_RETURN_TO) {
  test(`isSafeAppPath keeps in-app path ${value}`, () => {
    assert.equal(isSafeAppPath(value), true);
    assert.equal(resolveReturnHref(value, "/fallback"), value);
  });
}

test("every accepted value stays on the app origin when a browser resolves it", () => {
  const base = "https://fitness.example";
  for (const value of GOOD_RETURN_TO) {
    assert.equal(new URL(value, base).origin, base, value);
  }
});

test("routine editor back flows refuse encoded open redirects (decodeReturnTo decodes once more)", () => {
  for (const raw of ["%2F%5Cevil.com", "/%5Cevil.com", "%2F%2Fevil.com", "%2F%09%2Fevil.com", "%252F%252Fevil.com", "https%3A%2F%2Fevil.com"]) {
    assert.equal(resolveRoutineEditBackHref("r1", raw), "/routines/r1", raw);
    assert.equal(resolveRoutineDayViewBackHref(raw), "/routines", raw);
  }

  assert.equal(resolveRoutineEditBackHref("r1", "%2Ftoday"), "/today");
  assert.equal(resolveRoutineEditBackHref("r1", "/today?tab=plan"), "/today?tab=plan");
});

test("routine editor hrefs drop unsafe returnTo values", () => {
  assert.equal(getRoutineEditHref("r1", "/\\evil.com"), "/routines/r1/edit");
  assert.equal(getRoutineDayEditHref("r1", "d2", "/\t/evil.com"), "/routines/r1/edit/day/d2");
  assert.equal(getRoutineEditHref("r1", "/today"), "/routines/r1/edit?returnTo=%2Ftoday");
});

test("preferred return href ignores hostile requested targets", () => {
  assert.equal(
    resolvePreferredReturnHref({ requestedReturnTo: "/\\evil.com", currentPath: "/session/a", stack: [], fallbackHref: "/today" }),
    "/today",
  );
});

test("other returnTo consumers share the hardened check", () => {
  assert.equal(resolveAccountReturnHref("/\\evil.com"), "/settings");
  assert.equal(resolveAccountReturnHref("/%5Cevil.com"), "/settings");
  assert.equal(resolveAccountReturnHref("/today?x=1"), "/today?x=1");
  assert.equal(getExerciseInfoHref("e1", { returnTo: "/\\evil.com" }), "/exercises/e1");
  assert.equal(getExerciseInfoHref("e1", { returnTo: "//evil.com" }), "/exercises/e1");
  assert.equal(getExerciseInfoHref("e1", { returnTo: "/today" }), "/exercises/e1?returnTo=%2Ftoday");
});
