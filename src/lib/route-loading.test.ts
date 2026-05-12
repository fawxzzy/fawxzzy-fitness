import test from "node:test";
import assert from "node:assert/strict";
import {
  getRouteLoadingDelayMs,
  INITIAL_EXPERIENCE_LOADING_VARIANT,
  ROUTE_LOADING_DELAY_MS,
  shouldHideRouteLoadingChrome,
} from "@/lib/route-loading";

test("InitialExperienceGate uses the immediate boot loader on /entry", () => {
  assert.equal(INITIAL_EXPERIENCE_LOADING_VARIANT, "boot");
  assert.equal(getRouteLoadingDelayMs(INITIAL_EXPERIENCE_LOADING_VARIANT), 0);
  assert.equal(shouldHideRouteLoadingChrome(INITIAL_EXPERIENCE_LOADING_VARIANT, false), true);
});

test("normal route loading still delays tab and route overlays", () => {
  assert.equal(ROUTE_LOADING_DELAY_MS, 260);
  assert.equal(getRouteLoadingDelayMs("route"), 260);
  assert.equal(shouldHideRouteLoadingChrome("route", false), false);
  assert.equal(shouldHideRouteLoadingChrome("route", true), true);
});
