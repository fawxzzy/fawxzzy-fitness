import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import test from "node:test";

import type { FitnessOutboundSignal } from "./fitness-integration-client.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

test("shadow telemetry writes accepted receipts for canonical fitness events", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-shadow-"));

  const signal: FitnessOutboundSignal = {
    fixtureId: "fixture-1",
    outboundId: "out-1",
    emittedAt: "2026-04-18T12:00:00.000Z",
    appId: "fitness",
    signalType: "workout_completed",
    routing: {
      target: "playbook",
      channel: "fitness.session.events",
      priority: "normal",
      maxDeliveryLatencySeconds: 60,
    },
    reason: "session_completed",
    payload: {
      memberId: "member-1",
      sessionId: "session-1",
      completedAt: "2026-04-18T12:00:00.000Z",
      durationMinutes: 45,
      completionRate: 1,
    },
  };

  const result = await emitFitnessShadowTelemetryBatch({
    signals: [signal],
    options: {
      atlasRoot: tempDir,
      receiptRoot: path.join(tempDir, "runtime", "receipts", "events"),
    },
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.receiptRefs.length, 1);

  const receiptPath = path.join(tempDir, result.receiptRefs[0]);
  const receipt = JSON.parse(await readFile(receiptPath, "utf-8"));
  assert.equal(receipt.event.event_type, "workout_completed");
  assert.equal(receipt.event.event_kind, "signal");
  assert.equal(receipt.event.correlation.member_id, "member-1");
  assert.equal(receipt.event.correlation.outbound_id, "out-1");
  assert.equal(receipt.processing.status, "accepted");
});

test("shadow telemetry keeps the primary flow alive when schema validation fails", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-shadow-"));

  const invalidSignal = {
    fixtureId: "fixture-2",
    outboundId: "out-2",
    emittedAt: "2026-04-18T12:00:00.000Z",
    appId: "fitness",
    signalType: "workout_completed",
    routing: {
      target: "playbook",
      channel: "fitness.session.events",
      priority: "normal",
      maxDeliveryLatencySeconds: 60,
    },
    reason: "session_completed",
    payload: {
      memberId: "member-2",
      sessionId: "session-2",
      completedAt: "2026-04-18T12:00:00.000Z",
      durationMinutes: 45,
    },
  } as const;

  const result = await emitFitnessShadowTelemetryBatch({
    signals: [invalidSignal as FitnessOutboundSignal],
    options: {
      atlasRoot: tempDir,
      receiptRoot: path.join(tempDir, "runtime", "receipts", "events"),
    },
  });

  assert.equal(result.receiptRefs.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /completionRate/);
});
