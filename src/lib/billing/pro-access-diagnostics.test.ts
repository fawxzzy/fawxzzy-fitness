import assert from "node:assert/strict";
import test from "node:test";

import { describeProAccessLoadFailure, logProAccessLoadFailure } from "@/lib/billing/pro-access-diagnostics";

test("describeProAccessLoadFailure keeps the stage, error code and message only", () => {
  const record = describeProAccessLoadFailure("entitlements", {
    code: "42501",
    message: "permission denied for table user_entitlements",
    details: "row contents that must not be logged",
    hint: "a hint",
  });

  assert.deepEqual(record, {
    tag: "[billing.pro-access]",
    stage: "entitlements",
    code: "42501",
    message: "permission denied for table user_entitlements",
  });
});

test("describeProAccessLoadFailure tolerates a missing code or message and bounds the message", () => {
  assert.deepEqual(describeProAccessLoadFailure("purchases", {}), {
    tag: "[billing.pro-access]",
    stage: "purchases",
    code: null,
    message: "unknown error",
  });
  assert.equal(describeProAccessLoadFailure("customer", { message: "x".repeat(1000) }).message.length, 300);
});

test("logProAccessLoadFailure writes one error record", (t) => {
  const calls: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => {
    calls.push(args);
  });

  logProAccessLoadFailure("customer", { code: "PGRST301", message: "JWT expired" });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], { tag: "[billing.pro-access]", stage: "customer", code: "PGRST301", message: "JWT expired" });
});
