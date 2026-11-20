import test from "node:test";
import assert from "node:assert/strict";

import { runBestEffortSteps } from "./best-effort-steps.ts";

test("a throwing step is logged and reported, never rethrown, and later steps still run", async () => {
  const ran: string[] = [];
  const logged: Array<{ message: string; details: Record<string, unknown> }> = [];

  const failed = await runBestEffortSteps(
    "today.discard",
    [
      ["signal", () => {
        ran.push("signal");
        throw new Error("signal store down");
      }],
      ["publish", async () => {
        ran.push("publish");
        throw new Error("publish timeout");
      }],
      ["after", () => {
        ran.push("after");
      }],
    ],
    (message, details) => logged.push({ message, details }),
  );

  assert.deepEqual(ran, ["signal", "publish", "after"]);
  assert.deepEqual(failed, ["signal", "publish"]);
  assert.equal(logged.length, 2);
  assert.equal(logged[0].message, "[today.discard] best-effort step failed");
  assert.deepEqual(logged[0].details, { step: "signal", error: "signal store down" });
});

test("a broken logger does not escape either", async () => {
  const failed = await runBestEffortSteps("ctx", [["x", () => Promise.reject("nope")]], () => {
    throw new Error("logger broke");
  });
  assert.deepEqual(failed, ["x"]);
});

test("all steps succeeding reports nothing", async () => {
  assert.deepEqual(await runBestEffortSteps("ctx", [["a", async () => 1]], () => assert.fail("no log")), []);
});
