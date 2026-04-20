import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import test from "node:test";

import type { FitnessInboundReceipt, FitnessOutboundSignal, FitnessOutboundSnapshot } from "./fitness-integration-client.ts";
import { buildFitnessGrowthPilotReadinessReport } from "./fitness-growth-pilot-readiness.ts";
import { buildFitnessGrowthShadowReport } from "./fitness-growth-shadow.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

async function writeAcceptedWarehouseEvent(input: {
  receiptRoot: string;
  eventType: string;
  eventKind: "signal" | "snapshot" | "receipt";
  occurredAt: string;
  sourceOutboundId: string;
  memberId: string;
  receiptId: string;
}): Promise<void> {
  const eventDir = path.join(input.receiptRoot, input.eventType);
  await mkdir(eventDir, { recursive: true });

  const payload = {
    memberId: input.memberId,
    sourceOutboundId: input.sourceOutboundId,
    occurredAt: input.occurredAt,
  };
  const receipt = {
    receipt_version: "atlas.fitness.shadow-event.receipt.v1",
    receipt_id: input.receiptId,
    recorded_at: input.occurredAt,
    atlas_root: ".",
    event: {
      contract_version: "atlas.fitness.shadow-event.v1",
      event_kind: input.eventKind,
      event_type: input.eventType,
      event_id: input.receiptId,
      occurred_at: input.occurredAt,
      producer: {
        kind: "service",
        name: "fitness-pilot-test",
        version: "1",
        host: "test-host",
        app_id: "fitness",
      },
      context: {
        workspace_root: "repos/fawxzzy-fitness",
        reason: "pilot_readiness_test",
      },
      correlation: {
        member_id: input.memberId,
        source_outbound_id: input.sourceOutboundId,
      },
      payload,
    },
    schema: {
      event_kind: input.eventKind,
      event_type: input.eventType,
      schema_ref: "truth-pack/fitness/event-contract/atlas-fitness-growth-pilot-readiness-pack.v1.json#tests",
    },
    processing: {
      accepted: true,
      status: "accepted",
      errors: [],
      handler: {
        status: "skipped",
        reason: "shadow_mode_no_handler",
      },
    },
  };

  const encoded = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(path.join(eventDir, `${input.receiptId}.json`), encoded, "utf8");
  await writeFile(path.join(eventDir, "latest.json"), encoded, "utf8");
}

test("pilot-readiness report holds the lane in shadow when required pilot evidence is missing", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-pilot-readiness-hold-"));
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
    {
      fixtureId: "snapshot-weekly-progress-suppressed",
      outboundId: "out-weekly-progress-suppressed",
      capturedAt: "2026-04-19T08:00:00.000Z",
      appId: "fitness",
      snapshotType: "weekly_progress_state",
      reason: "manual_debug",
      snapshot: {
        memberId: "member-b",
        weekStartDate: "2026-04-13",
        plannedWorkoutCount: 4,
        completedWorkoutCount: 2,
        capturedAt: "2026-04-19T08:00:00.000Z",
      },
    },
  ];

  const signals: FitnessOutboundSignal[] = [
    {
      fixtureId: "signal-weekly-goal-hit-suppressed",
      outboundId: "out-weekly-goal-hit-suppressed",
      emittedAt: "2026-04-19T09:00:00.000Z",
      appId: "fitness",
      signalType: "weekly_goal_hit",
      routing: {
        target: "playbook",
        channel: "fitness.goal.events",
        priority: "normal",
        maxDeliveryLatencySeconds: 120,
      },
      reason: "manual_debug",
      payload: {
        memberId: "member-b",
        weekStartDate: "2026-04-13",
        workoutsPlanned: 4,
        workoutsCompleted: 4,
        achievedAt: "2026-04-19T09:00:00.000Z",
      },
    },
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
    {
      fixtureId: "signal-recovery-warning-suppressed",
      outboundId: "out-recovery-warning-suppressed",
      emittedAt: "2026-04-19T10:05:00.000Z",
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
        memberId: "member-b",
        readinessScore: 29,
        fatigueScore: 78,
        warningLevel: "critical",
        observedAt: "2026-04-19T10:05:00.000Z",
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

  const result = await emitFitnessShadowTelemetryBatch({
    snapshots,
    signals,
    receipts,
    options: {
      atlasRoot: tempDir,
      receiptRoot,
    },
  });

  assert.deepEqual(result.errors, []);

  const report = buildFitnessGrowthPilotReadinessReport({
    receiptRoot,
  });

  assert.equal(report.decision, "stay_shadow");
  assert.ok(report.stay_shadow_reasons.some((reason) => reason.includes("minimum-eligible-population")));
  assert.ok(report.stay_shadow_reasons.some((reason) => reason.includes("minimum-shadow-ctr")));
  assert.ok(report.stay_shadow_reasons.some((reason) => reason.includes("pilot-gate-requires-observable-click-activation-retention-feedback")));
});

test("pilot-readiness report allows one narrow sticky cohort when the frozen gate clears", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-pilot-readiness-pass-"));
  const receiptRoot = path.join(tempDir, "runtime", "receipts", "events");

  const weekStartDate = "2026-04-13";
  const snapshotTime = "2026-04-19T08:00:00.000Z";
  const warningBaseHour = 10;

  const snapshots: FitnessOutboundSnapshot[] = [];
  const signals: FitnessOutboundSignal[] = [];
  const receipts: FitnessInboundReceipt[] = [];

  for (let index = 0; index < 24; index += 1) {
    const memberId = `member-${index + 1}`;
    const outboundId = `out-recovery-warning-${index + 1}`;
    const warningHour = String(warningBaseHour + Math.floor(index / 6)).padStart(2, "0");
    const warningMinute = String((index % 6) * 5).padStart(2, "0");
    const warningIso = `2026-04-19T${warningHour}:${warningMinute}:00.000Z`;

    snapshots.push({
      fixtureId: `snapshot-weekly-progress-${index + 1}`,
      outboundId: `out-weekly-progress-${index + 1}`,
      capturedAt: snapshotTime,
      appId: "fitness",
      snapshotType: "weekly_progress_state",
      reason: "manual_debug",
      snapshot: {
        memberId,
        weekStartDate,
        plannedWorkoutCount: 4,
        completedWorkoutCount: index % 3,
        capturedAt: snapshotTime,
      },
    });

    signals.push({
      fixtureId: `signal-recovery-warning-${index + 1}`,
      outboundId,
      emittedAt: warningIso,
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
        memberId,
        readinessScore: 30 + (index % 4),
        fatigueScore: 70 + (index % 5),
        warningLevel: index % 2 === 0 ? "warning" : "critical",
        observedAt: warningIso,
      },
    });

    if (index < 16) {
      receipts.push({
        receiptType: "recovery_guardrail_applied",
        receiptId: `receipt-recovery-${index + 1}`,
        actionType: "schedule_recovery_block",
        memberId,
        appliedAt: `2026-04-19T${warningHour}:${String((index % 6) * 5 + 2).padStart(2, "0")}:00.000Z`,
        sourceOutboundId: outboundId,
        payload: {
          recoveryMinutes: 45,
        },
      });
    }
  }

  const result = await emitFitnessShadowTelemetryBatch({
    snapshots,
    signals,
    receipts,
    options: {
      atlasRoot: tempDir,
      receiptRoot,
    },
  });

  assert.deepEqual(result.errors, []);

  const growthReport = buildFitnessGrowthShadowReport({
    receiptRoot,
  });
  const placedCandidates = growthReport.candidates.filter((candidate) => candidate.placement_status === "shadow_placed");
  assert.ok(placedCandidates.length >= 8, "Expected enough placed candidates to evaluate pilot readiness");

  for (const candidate of placedCandidates) {
    await writeAcceptedWarehouseEvent({
      receiptRoot,
      eventType: "pilot_shadow_impression_logged",
      eventKind: "signal",
      occurredAt: candidate.trigger_occurred_at,
      sourceOutboundId: candidate.source_outbound_id,
      memberId: candidate.member_id,
      receiptId: `impression-${candidate.source_outbound_id}`,
    });
  }

  const clickedCandidates = placedCandidates.slice(0, Math.max(6, Math.floor(placedCandidates.length * 0.75)));
  for (const candidate of clickedCandidates) {
    await writeAcceptedWarehouseEvent({
      receiptRoot,
      eventType: "pilot_shadow_click_logged",
      eventKind: "signal",
      occurredAt: "2026-04-19T18:00:00.000Z",
      sourceOutboundId: candidate.source_outbound_id,
      memberId: candidate.member_id,
      receiptId: `click-${candidate.source_outbound_id}`,
    });
  }

  const retainedCandidates = clickedCandidates.slice(0, Math.max(4, Math.floor(clickedCandidates.length * 0.67)));
  for (const candidate of retainedCandidates) {
    await writeAcceptedWarehouseEvent({
      receiptRoot,
      eventType: "pilot_activation_retained",
      eventKind: "receipt",
      occurredAt: "2026-04-22T18:00:00.000Z",
      sourceOutboundId: candidate.source_outbound_id,
      memberId: candidate.member_id,
      receiptId: `retained-${candidate.source_outbound_id}`,
    });
  }

  const report = buildFitnessGrowthPilotReadinessReport({
    receiptRoot,
  });

  assert.equal(report.decision, "allow_narrow_sticky_pilot");
  assert.ok(report.threshold_checks.every((check) => check.passed), "All pilot thresholds must pass");
  assert.ok(report.acceptance_checks.every((check) => check.passed), "All pilot acceptance checks must pass");
  assert.equal(report.rollback_alerts.length, 0);
  assert.equal(report.pilot_rollout_policy.proposed_live_cohort_members, 2);
});
