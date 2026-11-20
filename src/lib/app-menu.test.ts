import assert from "node:assert/strict";
import test from "node:test";
import { APP_MENU_DESTINATIONS, nextMenuFocusIndex, resolveActiveMenuHref } from "./app-menu.ts";

test("menu destinations are Today, Routines, History, Settings and never leave the app", () => {
  assert.deepEqual(APP_MENU_DESTINATIONS.map((item) => item.label), ["Today", "Routines", "History", "Settings"]);
  for (const item of APP_MENU_DESTINATIONS) {
    assert.match(item.href, /^\/[a-z]+$/);
  }
});

test("the active destination follows the route, including nested routes", () => {
  assert.equal(resolveActiveMenuHref("/today"), "/today");
  assert.equal(resolveActiveMenuHref("/routines/abc/edit"), "/routines");
  assert.equal(resolveActiveMenuHref("/history/exercises"), "/history");
  assert.equal(resolveActiveMenuHref("/settings"), "/settings");
});

test("/account highlights Settings; other screens highlight nothing", () => {
  assert.equal(resolveActiveMenuHref("/account"), "/settings");
  assert.equal(resolveActiveMenuHref("/account/security"), "/settings");
  assert.equal(resolveActiveMenuHref("/session/123"), null);
  assert.equal(resolveActiveMenuHref("/todayish"), null, "a prefix without a slash is not a match");
  assert.equal(resolveActiveMenuHref(""), null);
  assert.equal(resolveActiveMenuHref(null), null);
});

test("arrow keys and Tab wrap inside the menu (focus trap)", () => {
  assert.equal(nextMenuFocusIndex(-1, "ArrowDown", 4), 0);
  assert.equal(nextMenuFocusIndex(0, "ArrowDown", 4), 1);
  assert.equal(nextMenuFocusIndex(3, "ArrowDown", 4), 0);
  assert.equal(nextMenuFocusIndex(3, "Tab", 4), 0);
  assert.equal(nextMenuFocusIndex(0, "ArrowUp", 4), 3);
  assert.equal(nextMenuFocusIndex(-1, "ArrowUp", 4), 3);
  assert.equal(nextMenuFocusIndex(0, "ShiftTab", 4), 3);
  assert.equal(nextMenuFocusIndex(2, "ShiftTab", 4), 1);
});

test("Home and End jump to the ends; an empty menu has nowhere to go", () => {
  assert.equal(nextMenuFocusIndex(2, "Home", 4), 0);
  assert.equal(nextMenuFocusIndex(0, "End", 4), 3);
  assert.equal(nextMenuFocusIndex(0, "ArrowDown", 0), -1);
});
