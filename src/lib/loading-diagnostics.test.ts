import test from "node:test";
import assert from "node:assert/strict";
import { startLoadingDiagnosticGate } from "./loading-diagnostics.ts";

test("loading diagnostics metadata stays serializable when callers pass odd values", () => {
  const gate = startLoadingDiagnosticGate({
    gate: "test.loading-diagnostics",
    route: "/entry",
    source: "server",
    metadata: {
      nested: {
        count: 2,
        when: new Date("2026-05-03T22:17:46.000Z"),
      },
      oddArray: [1, BigInt(3), new Error("oops")],
      callback: () => "skip",
    },
  });

  const snapshot = gate.snapshot();
  assert.deepEqual(snapshot.metadata, {
    nested: {
      count: 2,
      when: "2026-05-03T22:17:46.000Z",
    },
    oddArray: [1, "3", { name: "Error", message: "oops" }],
    callback: "() => \"skip\"",
  });
});
