import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_TAB_DESTINATIONS,
  classifyAppRoute,
  isDevPath,
  isKeyboardSqueezingLayout,
  normalizeAppPath,
  resolveActiveTabHref,
  resolveAppTabBarPath,
  resolveAppTabBarVisibility,
} from "./app-tabs.ts";

const visible = (pathname: string) => resolveAppTabBarVisibility({ pathname });

test("tabs are Today, Routines, History, Settings and never leave the app", () => {
  assert.deepEqual(APP_TAB_DESTINATIONS.map((item) => item.label), ["Today", "Routines", "History", "Settings"]);
  for (const item of APP_TAB_DESTINATIONS) {
    assert.match(item.href, /^\/[a-z]+$/);
  }
});

test("the active tab follows the route, including nested routes", () => {
  assert.equal(resolveActiveTabHref("/today"), "/today");
  assert.equal(resolveActiveTabHref("/routines/abc/edit"), "/routines");
  assert.equal(resolveActiveTabHref("/history/exercises"), "/history");
  assert.equal(resolveActiveTabHref("/settings"), "/settings");
  assert.equal(resolveActiveTabHref("/history/?view=list"), "/history");
});

test("/account highlights Settings; other screens highlight nothing", () => {
  assert.equal(resolveActiveTabHref("/account"), "/settings");
  assert.equal(resolveActiveTabHref("/session/123"), null);
  assert.equal(resolveActiveTabHref("/todayish"), null, "a prefix without a slash is not a match");
  assert.equal(resolveActiveTabHref(""), null);
  assert.equal(resolveActiveTabHref(null), null);
});

// The route-visibility table in docs/mobile-shell-contract.md ("Bottom tab bar"). Keep the two in step.
const VISIBILITY_TABLE: ReadonlyArray<[string, ReturnType<typeof classifyAppRoute>]> = [
  ["/today", "tab"],
  ["/routines", "tab"],
  ["/history", "tab"],
  ["/settings", "tab"],
  ["/routines/r-1", "child"],
  ["/routines/workout-plans", "child"],
  ["/history/s-1", "child"],
  ["/history/exercises", "child"],
  ["/history/progression", "child"],
  ["/account", "child"],
  ["/session/s-1", "workout"],
  ["/session/s-1/add-exercise", "workout"],
  ["/routines/new", "flow"],
  ["/routines/r-1/edit", "flow"],
  ["/routines/r-1/edit/day/d-1", "flow"],
  ["/routines/r-1/edit/day/d-1/add-exercise", "flow"],
  ["/routines/r-1/new-day", "flow"],
  ["/routines/r-1/new-workout-plan", "flow"],
  ["/routines/r-1/days/d-1", "flow"],
  ["/", "outside"],
  ["/login", "outside"],
  ["/signup", "outside"],
  ["/forgot-password", "outside"],
  ["/reset-password", "outside"],
  ["/auth/confirm", "outside"],
  ["/entry", "outside"],
  ["/install", "outside"],
  ["/curated-onboarding", "outside"],
  ["/review/optional-planned-day", "outside"],
  ["/privacy", "outside"],
  ["/terms", "outside"],
  ["/offline", "outside"],
  ["/exercises/e-1", "outside"],
  ["/dev/mobile-regression", "outside"],
  ["/history/s-1/extra", "outside"],
  ["/settings/anything", "outside"],
  ["/nope", "outside"],
];

test("every route lands in the documented kind", () => {
  for (const [pathname, kind] of VISIBILITY_TABLE) {
    assert.equal(classifyAppRoute(pathname), kind, pathname);
  }
});

test("the bar shows on tab roots and read-only children only", () => {
  for (const [pathname, kind] of VISIBILITY_TABLE) {
    assert.equal(visible(pathname), kind === "tab" || kind === "child", pathname);
  }
});

test("trailing slashes and query strings do not change the decision", () => {
  assert.equal(normalizeAppPath("/today/"), "/today");
  assert.equal(normalizeAppPath("/history?x=1#y"), "/history");
  assert.equal(visible("/today/"), true);
  assert.equal(visible("/routines/new/"), false);
  assert.equal(visible(""), false);
  assert.equal(resolveAppTabBarVisibility({ pathname: null }), false);
});

test("an in-route editor or a squeezing keyboard hides the bar even on a tab", () => {
  assert.equal(resolveAppTabBarVisibility({ pathname: "/history/s-1", suppressed: true }), false);
  assert.equal(resolveAppTabBarVisibility({ pathname: "/today", keyboardOpen: true }), false);
  assert.equal(resolveAppTabBarVisibility({ pathname: "/today", suppressed: false, keyboardOpen: false }), true);
});

test("a /dev fixture can preview a product route; the preview never applies outside /dev", () => {
  assert.equal(isDevPath("/dev"), true);
  assert.equal(isDevPath("/dev/mobile-regression"), true);
  assert.equal(isDevPath("/devices"), false);
  assert.equal(resolveAppTabBarPath("/dev/mobile-regression", "/today"), "/today");
  assert.equal(resolveAppTabBarPath("/dev/mobile-regression", null), "/dev/mobile-regression");
  assert.equal(resolveAppTabBarPath("/routines/new", "/today"), "/routines/new");
  assert.equal(visible(resolveAppTabBarPath("/dev/mobile-regression", "/session/x")), false);
});

test("the keyboard only counts when the layout viewport shrinks with a field focused", () => {
  assert.equal(isKeyboardSqueezingLayout({ baselineHeight: 844, currentHeight: 500, editableFocused: true }), true);
  assert.equal(isKeyboardSqueezingLayout({ baselineHeight: 844, currentHeight: 844, editableFocused: true }), false, "iOS / Chrome resizes-visual: no change, no hide");
  assert.equal(isKeyboardSqueezingLayout({ baselineHeight: 844, currentHeight: 500, editableFocused: false }), false, "a rotate or window resize is not a keyboard");
  assert.equal(isKeyboardSqueezingLayout({ baselineHeight: 844, currentHeight: 760, editableFocused: true }), false, "a small change (URL bar) is not a keyboard");
  assert.equal(isKeyboardSqueezingLayout({ baselineHeight: 0, currentHeight: 0, editableFocused: true }), false);
});
