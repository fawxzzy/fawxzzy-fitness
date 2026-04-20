import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fitnessSignalFixtures } from "./fixtures/signals/index.ts";
import { fitnessStateSnapshotFixtures } from "./fixtures/state-snapshots/index.ts";
import { emitFitnessShadowTelemetryBatch } from "./fitness-shadow-events.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const signalCatalogPath = path.join(repoRoot, "truth-pack", "fitness", "signals.json");

type ShadowReceiptKind = "signal" | "snapshot" | "receipt";

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function schemaBucketFor(kind: ShadowReceiptKind): "signals" | "stateSnapshots" | "receipts" {
  if (kind === "signal") {
    return "signals";
  }

  if (kind === "snapshot") {
    return "stateSnapshots";
  }

  return "receipts";
}

function assertAcceptedShadowReceipt(
  receipt: any,
  expected: {
    kind: ShadowReceiptKind;
    eventType: string;
  },
): void {
  assert.equal(receipt.receipt_version, "atlas.fitness.shadow-event.receipt.v1");
  assert.equal(receipt.event.contract_version, "atlas.fitness.shadow-event.v1");
  assert.equal(receipt.event.event_kind, expected.kind);
  assert.equal(receipt.event.event_type, expected.eventType);
  assert.equal(receipt.processing.accepted, true);
  assert.equal(receipt.processing.status, "accepted");
  assert.deepEqual(receipt.processing.errors, []);
  assert.equal(receipt.schema.event_kind, expected.kind);
  assert.equal(receipt.schema.event_type, expected.eventType);
  assert.equal(
    receipt.schema.schema_ref,
    `repos/fawxzzy-fitness/src/lib/ecosystem/fitness-integration-contract.ts#${schemaBucketFor(expected.kind)}.${expected.eventType}`,
  );
  assert.equal(typeof receipt.recorded_at, "string");
  assert.equal(typeof receipt.paths.receipt_path, "string");
  assert.equal(typeof receipt.paths.latest_path, "string");
  assert.equal(typeof receipt.event.payload, "object");
}

async function readLatestReceipt(
  tempDir: string,
  eventType: string,
): Promise<any> {
  const receiptPath = path.join(tempDir, "runtime", "receipts", "events", eventType, "latest.json");
  return JSON.parse(await readFile(receiptPath, "utf8"));
}

function asOutboundSignals() {
  return fitnessSignalFixtures.map((fixture, index) => ({
    ...fixture,
    outboundId: `warehouse-signal-${index + 1}`,
    reason: "manual_debug" as const,
  }));
}

function asOutboundSnapshots() {
  return fitnessStateSnapshotFixtures.map((fixture, index) => ({
    ...fixture,
    outboundId: `warehouse-snapshot-${index + 1}`,
    reason: "manual_debug" as const,
  }));
}

test("critical truth-pack signal types arrive in the shadow receipt sink", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-shadow-warehouse-"));
  const signalCatalog = loadJson<{ signals: Array<{ type: string }> }>(signalCatalogPath);

  const result = await emitFitnessShadowTelemetryBatch({
    signals: asOutboundSignals(),
    options: {
      atlasRoot: tempDir,
      receiptRoot: path.join(tempDir, "runtime", "receipts", "events"),
    },
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.receiptRefs.length, signalCatalog.signals.length);

  for (const signal of signalCatalog.signals) {
    const receipt = await readLatestReceipt(tempDir, signal.type);
    assertAcceptedShadowReceipt(receipt, {
      kind: "signal",
      eventType: signal.type,
    });
  }
});

test("snapshot and receipt warehouse entries keep accepted persisted shape", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fitness-shadow-warehouse-"));

  const result = await emitFitnessShadowTelemetryBatch({
    snapshots: asOutboundSnapshots(),
    receipts: [
      {
        receiptType: "goal_plan_amended",
        receiptId: "receipt-goal-plan-1",
        actionType: "revise_weekly_goal_plan",
        memberId: "member-warehouse-1",
        appliedAt: "2026-04-18T12:00:00.000Z",
        sourceOutboundId: "outbound-goal-plan-1",
        payload: {
          newWorkoutTarget: 4,
          weekStartDate: "2026-04-14",
        },
      },
    ],
    options: {
      atlasRoot: tempDir,
      receiptRoot: path.join(tempDir, "runtime", "receipts", "events"),
    },
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.receiptRefs.length, fitnessStateSnapshotFixtures.length + 1);

  for (const snapshot of fitnessStateSnapshotFixtures) {
    const receipt = await readLatestReceipt(tempDir, snapshot.snapshotType);
    assertAcceptedShadowReceipt(receipt, {
      kind: "snapshot",
      eventType: snapshot.snapshotType,
    });
  }

  const receipt = await readLatestReceipt(tempDir, "goal_plan_amended");
  assertAcceptedShadowReceipt(receipt, {
    kind: "receipt",
    eventType: "goal_plan_amended",
  });
});
