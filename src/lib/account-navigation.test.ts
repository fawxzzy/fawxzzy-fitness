import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACCOUNT_RETURN_HREF,
  getAccountRouteHref,
  resolveAccountReturnHref,
} from "./account-navigation.ts";

test("account navigation keeps safe Fitness-origin return targets", () => {
  assert.equal(resolveAccountReturnHref("/settings?section=account"), "/settings?section=account");
  assert.equal(resolveAccountReturnHref("/today#plan"), "/today#plan");
  assert.equal(getAccountRouteHref(), "/account?returnTo=%2Fsettings");
});

test("account navigation rejects external, malformed, and self-referential targets", () => {
  for (const value of [
    null,
    "",
    "https://evil.example/settings",
    "//evil.example/settings",
    "/\\evil.example/settings",
    "/%5cevil.example/settings",
    "/account",
    "/account?returnTo=/account",
    "/foo/..//evil.example",
    "/%2e//evil.example",
    "/%2e%2e//evil.example",
    "/settings%ZZ",
    "/settings\n/evil",
  ]) {
    assert.equal(resolveAccountReturnHref(value), DEFAULT_ACCOUNT_RETURN_HREF);
  }
});
