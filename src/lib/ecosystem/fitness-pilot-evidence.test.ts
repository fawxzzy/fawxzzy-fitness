import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import test from "node:test";

import type { FitnessInboundReceipt, FitnessOutboundSignal, FitnessOutboundSnapshot } from "./fitness-integration-client.ts";
import { recordFitnessPilotEvidenceSignalWithOptions, backfillFitnessPilotShadowImpressions } from "./fitness-pilot-evidence.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

async function readLatestReceipt(tempDir: string, eventType: string) {
  const receiptPath = path.join(tempDir, "runtime", "receipts", "events", eventType, "latest.json");
  return JSON.parse(await readFile(receiptPath, "utf8"));
}

test("recordFitnessPilotEvidenceSignal writes a contract-backed pilot evidence signal", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-pilot-evidence-"));

  const receiptRoot = path.join(tempDir, "runtime", "receipts", "events");

  const result = await recordFitnessPilotEvidenceSignalWithOptions({
    memberId: "member-evidence-1",
    signalType: "pilot_shadow_click_logged",
    sourceOutboundId: "out-recovery-warning-evidence-1",
    occurredAt: "2026-04-19T10:02:00.000Z",
    cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
    atlasRoot: tempDir,
    receiptRoot,
  });

  assert.equal(result.shadowTelemetry.errors.length, 0);
  assert.equal(result.signal.signalType, "pilot_shadow_click_logged");
  const receipt = await readLatestReceipt(tempDir, "pilot_shadow_click_logged");
  assert.equal(receipt.event.payload.sourceOutboundId, "out-recovery-warning-evidence-1");
});

test("backfillFitnessPilotShadowImpressions emits impression receipts for shadow placed candidates", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-pilot-impression-backfill-"));
  const receiptRoot = path.join(tempDir, "runtime", "receipts", "events");

  const snapshots: FitnessOutboundSnapshot[] = [
    {
      fixtureId: "snapshot-weekly-progress-treatment",
      outboundId: "out-weekly-progress-treatment",
      capturedAt: "2026-04-19T08:00:00.000Z",
      appId: "fitness",
      snapshotType: "weekly_progress_state",
      reason: "manual_debug",
      snapshot: {
        memberId: "member-treatment",
        weekStartDate: "2026-04-13",
        plannedWorkoutCount: 4,
        completedWorkoutCount: 1,
        capturedAt: "2026-04-19T08:00:00.000Z",
      },
    },
  ];

  const signals: FitnessOutboundSignal[] = [
    {
      fixtureId: "signal-recovery-warning-treatment",
      outboundId: "out-recovery-warning-treatment",
      emittedAt: "2026-04-19T10:00:00.000Z",
      appId: "fitness",
      signalType: "recovery_warning",
      routing: {
        target: "playbook",
        channel: "fitness.recovery.events",
        priority: "high",
        maxDeliveryLatencySeconds: 30,
      },
      reason: "recovery_evaluation",
      payload: {
        memberId: "member-treatment",
        readinessScore: 31,
        fatigueScore: 74,
        warningLevel: "warning",
        observedAt: "2026-04-19T10:00:00.000Z",
      },
    },
  ];

  const receipts: FitnessInboundReceipt[] = [
    {
      receiptType: "recovery_guardrail_applied",
      receiptId: "receipt-recovery-treatment",
      actionType: "schedule_recovery_block",
      memberId: "member-treatment",
      appliedAt: "2026-04-19T11:00:00.000Z",
      sourceOutboundId: "out-recovery-warning-treatment",
      payload: {
        recoveryMinutes: 45,
      },
    },
  ];

  const baseline = await emitFitnessShadowTelemetryBatch({
    snapshots,
    signals,
    receipts,
    options: {
      atlasRoot: tempDir,
      receiptRoot,
    },
  });

  assert.deepEqual(baseline.errors, []);

  const result = await backfillFitnessPilotShadowImpressions({
    receiptRoot,
    atlasRoot: tempDir,
  });

  assert.equal(result.attempted_count, 1);
  assert.equal(result.emitted_count, 1);

  const receipt = await readLatestReceipt(tempDir, "pilot_shadow_impression_logged");
  assert.equal(receipt.event.event_type, "pilot_shadow_impression_logged");
  assert.equal(receipt.event.payload.sourceOutboundId, "out-recovery-warning-treatment");
});
