import assert from "node:assert/strict";
import test from "node:test";

import { fitnessSignalFixtures } from "./fixtures/signals/index.ts";
import { fitnessStateSnapshotFixtures } from "./fixtures/state-snapshots/index.ts";
import {
  fitnessIntegrationContract,
  validateActionReceiptMappings,
  validateSignalFixture,
  validateStateSnapshotFixture,
} from "./fitness-integration-contract.ts";

test("all deterministic signal fixtures validate against the fitness contract", () => {
  for (const fixture of fitnessSignalFixtures) {
    const result = validateSignalFixture(fixture);
    assert.equal(result.ok, true, `Signal fixture ${fixture.fixtureId} failed: ${result.errors.join(", ")}`);

    const signalContract = fitnessIntegrationContract.signals.find((signal) => signal.type === fixture.signalType);
    assert.ok(signalContract, `Missing signal contract for ${fixture.signalType}`);
    assert.equal(signalContract?.requiresPlaybookIngestion, true);
    assert.equal(fixture.routing.target, "playbook");
  }
});

test("all deterministic state snapshot fixtures validate against the fitness contract", () => {
  for (const fixture of fitnessStateSnapshotFixtures) {
    const result = validateStateSnapshotFixture(fixture);
    assert.equal(result.ok, true, `State fixture ${fixture.fixtureId} failed: ${result.errors.join(", ")}`);
  }
});

test("all bounded actions declare valid receipt mappings and playbook constraints", () => {
  const result = validateActionReceiptMappings();
  assert.equal(result.ok, true, `Action/receipt validation failed: ${result.errors.join(", ")}`);

  for (const action of fitnessIntegrationContract.actions) {
    assert.ok(action.inputSchema.length > 0, `${action.type} must define a bounded input schema`);
    assert.ok(
      action.inputSchema.some((field) => field.required),
      `${action.type} must include required input fields`,
    );
    assert.ok(action.constraints.includes("no_direct_lifeline_bypass"));
  }
});
