import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { FitnessInboundReceipt, FitnessOutboundSignal, FitnessOutboundSnapshot } from "./fitness-integration-client.ts";
import { buildFitnessDashboardReport, loadFitnessFunnelDashboardPack, loadFitnessWave2MetricsPack } from "./fitness-funnel-dashboard.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const dashboardSchemaPath = path.join(
  repoRoot,
  "truth-pack",
  "fitness",
  "event-contract",
  "schemas",
  "atlas-fitness-funnel-dashboard-pack.schema.v1.json",
);

type DashboardSchema = {
  required: string[];
};

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

test("dashboard pack stays pinned to the frozen metrics pack and its schema shell", () => {
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const schema = loadJson<DashboardSchema>(dashboardSchemaPath);

  for (const key of schema.required) {
    assert.ok(key in dashboardPack, `Dashboard pack missing required key '${key}'`);
  }

  assert.equal(dashboardPack.consumer_of_pack_version, metricsPack.pack_version);
  assert.deepEqual(dashboardPack.selected_funnels.sort(), ["recovery_guardrail_funnel", "weekly_adherence_funnel"]);
  assert.deepEqual(
    dashboardPack.selected_kpis.sort(),
    [
      "recovery_guardrail_application_rate",
      "recovery_warning_rate",
      "weekly_goal_hit_rate",
      "workout_completion_rate",
    ],
  );
});

test("dashboard report computes KPI numerators, denominators, and funnel stages from the shadow warehouse", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-dashboard-warehouse-"));
  const receiptRoot = path.join(tempDir, "runtime", "receipts", "events");

  const snapshots: FitnessOutboundSnapshot[] = [
    {
      fixtureId: "snapshot-weekly-progress-1",
      outboundId: "out-weekly-progress-1",
      capturedAt: "2026-04-19T12:00:00.000Z",
      appId: "fitness",
      snapshotType: "weekly_progress_state",
      reason: "manual_debug",
      snapshot: {
        memberId: "member-1",
        weekStartDate: "2026-04-13",
        plannedWorkoutCount: 4,
        completedWorkoutCount: 2,
        capturedAt: "2026-04-19T12:00:00.000Z",
      },
    },
    {
      fixtureId: "snapshot-athlete-readiness-1",
      outboundId: "out-athlete-readiness-1",
      capturedAt: "2026-04-19T12:00:00.000Z",
      appId: "fitness",
      snapshotType: "athlete_readiness_state",
      reason: "manual_debug",
      snapshot: {
        memberId: "member-1",
        readinessScore: 35,
        fatigueScore: 81,
        capturedAt: "2026-04-19T12:00:00.000Z",
      },
    },
  ];

  const signals: FitnessOutboundSignal[] = [
    {
      fixtureId: "signal-workout-completed-1",
      outboundId: "out-workout-completed-1",
      emittedAt: "2026-04-19T12:05:00.000Z",
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
        completedAt: "2026-04-19T12:04:00.000Z",
        durationMinutes: 45,
        completionRate: 1,
      },
    },
    {
      fixtureId: "signal-workout-missed-1",
      outboundId: "out-workout-missed-1",
      emittedAt: "2026-04-19T12:06:00.000Z",
      appId: "fitness",
      signalType: "workout_missed",
      routing: {
        target: "playbook",
        channel: "fitness.session.events",
        priority: "high",
        maxDeliveryLatencySeconds: 60,
      },
      reason: "session_discarded",
      payload: {
        memberId: "member-1",
        sessionId: "session-2",
        scheduledAt: "2026-04-19T12:00:00.000Z",
        missReasonCode: "no_check_in",
        consecutiveMisses: 1,
      },
    },
    {
      fixtureId: "signal-weekly-goal-hit-1",
      outboundId: "out-weekly-goal-hit-1",
      emittedAt: "2026-04-19T12:07:00.000Z",
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
        memberId: "member-1",
        weekStartDate: "2026-04-13",
        workoutsPlanned: 4,
        workoutsCompleted: 4,
        achievedAt: "2026-04-19T12:07:00.000Z",
      },
    },
    {
      fixtureId: "signal-recovery-warning-1",
      outboundId: "out-recovery-warning-1",
      emittedAt: "2026-04-19T12:08:00.000Z",
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
        memberId: "member-1",
        readinessScore: 35,
        fatigueScore: 81,
        warningLevel: "critical",
        observedAt: "2026-04-19T12:08:00.000Z",
      },
    },
  ];

  const receipts: FitnessInboundReceipt[] = [
    {
      receiptType: "recovery_guardrail_applied",
      receiptId: "receipt-recovery-1",
      actionType: "schedule_recovery_block",
      memberId: "member-1",
      appliedAt: "2026-04-19T12:09:00.000Z",
      sourceOutboundId: "out-recovery-warning-1",
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

  const report = buildFitnessDashboardReport({
    receiptRoot,
  });

  assert.equal(report.pack_id, "atlas-fitness-funnel-dashboard-pack");
  assert.equal(report.consumer_of_pack_version, "atlas.fitness.wave-2-metrics-pack.v1");
  assert.equal(report.warehouse_receipt_count, 7);

  const weeklyGoal = report.kpis.find((entry) => entry.kpi_id === "weekly_goal_hit_rate");
  assert.deepEqual(weeklyGoal, {
    kpi_id: "weekly_goal_hit_rate",
    label: "Weekly goal hit rate",
    numerator: 1,
    denominator: 1,
    value: 1,
    unit: "ratio",
  });

  const completion = report.kpis.find((entry) => entry.kpi_id === "workout_completion_rate");
  assert.deepEqual(completion, {
    kpi_id: "workout_completion_rate",
    label: "Workout completion rate",
    numerator: 1,
    denominator: 2,
    value: 0.5,
    unit: "ratio",
  });

  const recoveryWarning = report.kpis.find((entry) => entry.kpi_id === "recovery_warning_rate");
  assert.deepEqual(recoveryWarning, {
    kpi_id: "recovery_warning_rate",
    label: "Recovery warning rate",
    numerator: 1,
    denominator: 1,
    value: 1,
    unit: "ratio",
  });

  const recoveryGuardrail = report.kpis.find((entry) => entry.kpi_id === "recovery_guardrail_application_rate");
  assert.deepEqual(recoveryGuardrail, {
    kpi_id: "recovery_guardrail_application_rate",
    label: "Recovery guardrail application rate",
    numerator: 1,
    denominator: 1,
    value: 1,
    unit: "ratio",
  });

  const weeklyFunnel = report.funnels.find((entry) => entry.funnel_id === "weekly_adherence_funnel");
  assert.deepEqual(
    weeklyFunnel?.stage_counts.map((entry) => [entry.stage_id, entry.count]),
    [
      ["weekly_progress_state_available", 1],
      ["workout_completed", 1],
      ["weekly_goal_hit", 1],
    ],
  );

  const recoveryFunnel = report.funnels.find((entry) => entry.funnel_id === "recovery_guardrail_funnel");
  assert.deepEqual(
    recoveryFunnel?.stage_counts.map((entry) => [entry.stage_id, entry.count]),
    [
      ["athlete_readiness_state_available", 1],
      ["recovery_warning", 1],
      ["recovery_guardrail_applied", 1],
    ],
  );

  assert.ok(report.acceptance_checks.every((entry) => entry.passed), "All dashboard acceptance checks must pass");
});
