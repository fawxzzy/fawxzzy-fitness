import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";

import type { FitnessInboundReceipt, FitnessOutboundSignal, FitnessOutboundSnapshot } from "./fitness-integration-client.ts";
import { buildFitnessGrowthShadowReport } from "./fitness-growth-shadow.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

test("growth shadow report freezes one measured placement against the dashboard baseline", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-growth-shadow-"));
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

  const report = buildFitnessGrowthShadowReport({
    receiptRoot,
  });

  assert.equal(report.pack_id, "atlas-fitness-growth-pack");
  assert.equal(report.pack_version, "atlas.fitness.growth-pack.v1");
  assert.deepEqual(report.consumer_of_pack_versions, [
    "atlas.fitness.wave-2-metrics-pack.v1",
    "atlas.fitness.funnel-dashboard-pack.v1",
  ]);
  assert.equal(report.warehouse_receipt_count, 6);
  assert.deepEqual(report.summary, {
    candidate_count: 2,
    eligible_count: 2,
    suppressed_count: 1,
    control_count: 0,
    placed_count: 1,
    attributed_conversion_count: 1,
  });

  assert.equal(report.baseline_dashboard.recovery_warning_stage_count, 2);
  assert.deepEqual(report.baseline_dashboard.recovery_guardrail_application_rate, {
    numerator: 1,
    denominator: 2,
    value: 0.5,
  });

  const treatmentCandidate = report.candidates.find((candidate) => candidate.member_id === "member-treatment");
  assert.deepEqual(treatmentCandidate, {
    placement_id: "recovery_reset_shadow_placement",
    member_id: "member-treatment",
    source_outbound_id: "out-recovery-warning-treatment",
    week_start_date: "2026-04-13",
    observed_day: "2026-04-19",
    trigger_occurred_at: "2026-04-19T10:00:00.000Z",
    experiment_arm: "treatment_shadow",
    cohort_id: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
    cohort_bucket: 80,
    eligible_rule_ids_met: ["actionable_recovery_warning", "open_weekly_progress_window"],
    ineligibility_reasons: [],
    suppression_rule_ids: [],
    placement_status: "shadow_placed",
    attribution: {
      placementId: "recovery_reset_shadow_placement",
      placementVersion: "atlas.fitness.growth-pack.v1",
      memberId: "member-treatment",
      sourceOutboundId: "out-recovery-warning-treatment",
      weekStartDate: "2026-04-13",
      cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
      experimentArm: "treatment_shadow",
      metricWindow: "rolling_7d",
    },
    deep_link: {
      pathname: "/today",
      params: {
        memberId: "member-treatment",
        sourceOutboundId: "out-recovery-warning-treatment",
        placementId: "recovery_reset_shadow_placement",
        cohortId: "fitness_growth_shadow_recovery_reset_v1:treatment_shadow:80",
      },
    },
    converted_on_primary_receipt: true,
  });

  const suppressedCandidate = report.candidates.find((candidate) => candidate.member_id === "member-b");
  assert.deepEqual(suppressedCandidate?.suppression_rule_ids, ["skip_if_weekly_goal_already_hit"]);
  assert.equal(suppressedCandidate?.placement_status, "suppressed");

  assert.ok(report.acceptance_checks.every((check) => check.passed), "All growth-pack acceptance checks must pass");
});
