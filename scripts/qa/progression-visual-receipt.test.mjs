import assert from "node:assert/strict";
import test from "node:test";

import { PROGRESSION_RECEIPT_SCENARIOS } from "./progression-visual-receipt.mjs";

test("today progression receipt follows the current inline Today-card contract", () => {
  const scenario = PROGRESSION_RECEIPT_SCENARIOS.find((entry) => entry.id === "today-progression-status");

  assert.ok(scenario, "Expected the Today progression receipt scenario to exist.");
  assert.deepEqual(
    scenario.actions.map((action) => ({
      id: action.id,
      type: action.type,
      text: "text" in action ? action.text : null,
    })),
    [
      { id: "promote-affordance-renders", type: "waitForText", text: "Promote" },
      { id: "primary-progression-card-renders", type: "waitForText", text: "Back Squat" },
      { id: "next-target-renders", type: "waitForText", text: "230 lbs" },
      { id: "companion-card-renders", type: "waitForText", text: "Walking Lunge" },
      { id: "card-surface-keeps-progression-summary", type: "assertExpression", text: null },
    ],
  );
});
