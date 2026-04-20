import { existsSync } from "node:fs";
import path from "node:path";

import { readAcceptedShadowWarehouseReceipts } from "./fitness-funnel-dashboard.ts";
import { buildFitnessGrowthShadowReport } from "./fitness-growth-shadow.ts";
import { fitnessIntegrationClient } from "./fitness-integration-client.ts";
import { buildFitnessSnapshotSourceStateFromApp } from "./fitness-integration-server.ts";
import {
  buildTodayRecoveryShadowPlacementModel,
  type TodayRecoveryShadowPlacement,
} from "./fitness-shadow-placement-model.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

type WarehouseReceipt = ReturnType<typeof readAcceptedShadowWarehouseReceipts>[number];

function toObservedDay(value: string): string {
  return value.slice(0, 10);
}

function findAtlasRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  for (;;) {
    if (existsSync(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}

function readPayloadString(receipt: WarehouseReceipt, key: string): string | null {
  const value = receipt.event.payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readCorrelationString(receipt: WarehouseReceipt, key: "member_id" | "outbound_id" | "week_start_date"): string | null {
  if (key === "member_id") {
    return receipt.event.correlation.member_id ?? readPayloadString(receipt, "memberId");
  }

  if (key === "outbound_id") {
    return receipt.event.correlation.outbound_id ?? null;
  }

  return receipt.event.correlation.week_start_date ?? readPayloadString(receipt, "weekStartDate");
}

function findLatestRecoveryWarningLineage(
  receipts: readonly WarehouseReceipt[],
  memberId: string,
  observedDay: string,
): { sourceOutboundId: string; occurredAt: string } | null {
  const matching = receipts
    .filter(
      (receipt) =>
        receipt.event.event_kind === "signal"
        && receipt.event.event_type === "recovery_warning"
        && readCorrelationString(receipt, "member_id") === memberId
        && toObservedDay(readPayloadString(receipt, "observedAt") ?? receipt.event.occurred_at) === observedDay,
    )
    .sort((left, right) => right.event.occurred_at.localeCompare(left.event.occurred_at));

  const latest = matching[0];
  if (!latest) {
    return null;
  }

  const sourceOutboundId = readCorrelationString(latest, "outbound_id");
  if (!sourceOutboundId) {
    return null;
  }

  return {
    sourceOutboundId,
    occurredAt: latest.event.occurred_at,
  };
}

function hasWeeklyProgressSnapshotForDay(
  receipts: readonly WarehouseReceipt[],
  memberId: string,
  weekStartDate: string,
  observedDay: string,
): boolean {
  return receipts.some(
    (receipt) =>
      receipt.event.event_kind === "snapshot"
      && receipt.event.event_type === "weekly_progress_state"
      && readCorrelationString(receipt, "member_id") === memberId
      && readCorrelationString(receipt, "week_start_date") === weekStartDate
      && toObservedDay(readPayloadString(receipt, "capturedAt") ?? receipt.event.occurred_at) === observedDay,
  );
}

export async function prepareTodayRecoveryShadowPlacement(input: {
  memberId: string;
  now?: Date | string;
}): Promise<TodayRecoveryShadowPlacement | null> {
  const now = input.now instanceof Date ? input.now : input.now ? new Date(input.now) : new Date();
  const atlasRoot = findAtlasRoot();
  const receiptRoot = path.join(atlasRoot, "runtime", "receipts", "events");
  const sourceState = await buildFitnessSnapshotSourceStateFromApp(input.memberId, now);
  const observedDay = toObservedDay(sourceState.capturedAt);

  const currentSignals = fitnessIntegrationClient.evaluateAndPackageSignals({
    source: sourceState,
    reason: "pilot_measurement",
  });
  const currentRecoveryWarning = currentSignals.find((signal) => signal.signalType === "recovery_warning");

  if (!currentRecoveryWarning) {
    return null;
  }

  const existingReceipts = readAcceptedShadowWarehouseReceipts(receiptRoot);
  const signalsToEmit = findLatestRecoveryWarningLineage(existingReceipts, input.memberId, observedDay)
    ? []
    : [currentRecoveryWarning];
  const snapshotsToEmit = hasWeeklyProgressSnapshotForDay(existingReceipts, input.memberId, sourceState.weekStartDate, observedDay)
    ? []
    : fitnessIntegrationClient.packageSnapshots({
        memberId: input.memberId,
        source: sourceState,
        reason: "pilot_measurement",
      }).exported;

  if (signalsToEmit.length > 0 || snapshotsToEmit.length > 0) {
    await emitFitnessShadowTelemetryBatch({
      signals: signalsToEmit,
      snapshots: snapshotsToEmit,
      options: {
        atlasRoot,
        receiptRoot,
      },
    });
  }

  const report = buildFitnessGrowthShadowReport({
    receiptRoot,
  });

  return buildTodayRecoveryShadowPlacementModel({
    report,
    memberId: input.memberId,
    observedDay,
  });
}
