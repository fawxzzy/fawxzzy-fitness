import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  FitnessInboundReceipt,
  FitnessOutboundSignal,
  FitnessOutboundSnapshot,
} from "./fitness-integration-client.ts";
import {
  fitnessIntegrationContract,
  validateReceiptFixture,
  validateSignalFixture,
  validateStateSnapshotFixture,
} from "./fitness-integration-contract.ts";

type FitnessShadowEventKind = "signal" | "snapshot" | "receipt";

type FitnessShadowTelemetryOptions = {
  readonly atlasRoot?: string;
  readonly receiptRoot?: string;
  readonly strict?: boolean;
};

type FitnessShadowEvent = {
  readonly contract_version: "atlas.fitness.shadow-event.v1";
  readonly event_kind: FitnessShadowEventKind;
  readonly event_type: string;
  readonly event_id: string;
  readonly occurred_at: string;
  readonly producer: {
    readonly kind: "service";
    readonly name: "fitness-shadow-emitter";
    readonly version: "1";
    readonly host: string;
    readonly app_id: string;
  };
  readonly context: {
    readonly workspace_root: "repos/fawxzzy-fitness";
    readonly reason: string;
  };
  readonly correlation: {
    readonly member_id: string;
    readonly outbound_id?: string;
    readonly source_outbound_id?: string;
    readonly session_id?: string;
    readonly week_start_date?: string;
  };
  readonly payload: Readonly<Record<string, string | number | boolean>>;
};

export type FitnessShadowTelemetryResult = {
  readonly receiptRefs: readonly string[];
  readonly errors: readonly string[];
};

type FitnessShadowReceipt = {
  receipt_version: "atlas.fitness.shadow-event.receipt.v1";
  receipt_id: string;
  recorded_at: string;
  atlas_root: string;
  event: FitnessShadowEvent;
  schema: {
    event_kind: FitnessShadowEventKind;
    event_type: string;
    schema_ref: string;
  };
  processing: {
    accepted: boolean;
    status: "accepted" | "rejected";
    errors: readonly string[];
    handler: {
      status: "skipped";
      reason: "shadow_mode_no_handler";
    };
  };
  paths?: {
    receipt_path: string;
    latest_path: string;
  };
};

const SHADOW_EVENT_CONTRACT_VERSION = "atlas.fitness.shadow-event.v1";
const SHADOW_RECEIPT_VERSION = "atlas.fitness.shadow-event.receipt.v1";
const SHADOW_PRODUCER_NAME = "fitness-shadow-emitter";
const SHADOW_PRODUCER_VERSION = "1";
const FITNESS_WORKSPACE_ROOT = "repos/fawxzzy-fitness";

function utcNow(): string {
  return new Date().toISOString();
}

function stampNow(): string {
  return new Date().toISOString().replace(/[-:.]/g, "").replace("T", "T").replace("Z", "Z");
}

function makeIdentifier(prefix: string): string {
  return `${prefix}-${stampNow()}`;
}

function safeToken(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._:-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "event";
}

function findAtlasRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);

  for (;;) {
    const stackManifest = path.join(current, "stack.yaml");
    if (existsSync(stackManifest)) {
      return current;
    }

    if (path.dirname(current) === current) {
      return path.resolve(startDir);
    }

    current = path.dirname(current);
  }
}

function normalizePathForAtlas(filePath: string, atlasRoot: string): string {
  const resolvedRoot = path.resolve(atlasRoot);
  const resolvedPath = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolvedPath);

  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative === "" ? "." : relative.split(path.sep).join("/");
  }

  return resolvedPath.split(path.sep).join("/");
}

function resolveReceiptRoot(options: FitnessShadowTelemetryOptions): { atlasRoot: string; receiptRoot: string } {
  const atlasRoot = path.resolve(options.atlasRoot ?? findAtlasRoot());
  const receiptRoot = path.resolve(options.receiptRoot ?? path.join(atlasRoot, "runtime", "receipts", "events"));
  return { atlasRoot, receiptRoot };
}

function buildCorrelationFromPayload(
  memberId: string,
  payload: Readonly<Record<string, string | number | boolean>>,
): FitnessShadowEvent["correlation"] {
  return {
    member_id: memberId,
    ...(typeof payload.sessionId === "string" && payload.sessionId.length > 0
      ? { session_id: payload.sessionId }
      : {}),
    ...(typeof payload.weekStartDate === "string" && payload.weekStartDate.length > 0
      ? { week_start_date: payload.weekStartDate }
      : {}),
  };
}

function buildSignalShadowEvent(signal: FitnessOutboundSignal): FitnessShadowEvent {
  return {
    contract_version: SHADOW_EVENT_CONTRACT_VERSION,
    event_kind: "signal",
    event_type: signal.signalType,
    event_id: safeToken(signal.outboundId),
    occurred_at: signal.emittedAt,
    producer: {
      kind: "service",
      name: SHADOW_PRODUCER_NAME,
      version: SHADOW_PRODUCER_VERSION,
      host: os.hostname(),
      app_id: fitnessIntegrationContract.identity.appId,
    },
    context: {
      workspace_root: FITNESS_WORKSPACE_ROOT,
      reason: signal.reason,
    },
    correlation: {
      ...buildCorrelationFromPayload(String(signal.payload.memberId ?? ""), signal.payload),
      outbound_id: signal.outboundId,
    },
    payload: signal.payload,
  };
}

function buildSnapshotShadowEvent(snapshot: FitnessOutboundSnapshot): FitnessShadowEvent {
  const memberId = typeof snapshot.snapshot.memberId === "string" ? snapshot.snapshot.memberId : "";

  return {
    contract_version: SHADOW_EVENT_CONTRACT_VERSION,
    event_kind: "snapshot",
    event_type: snapshot.snapshotType,
    event_id: safeToken(snapshot.outboundId),
    occurred_at: snapshot.capturedAt,
    producer: {
      kind: "service",
      name: SHADOW_PRODUCER_NAME,
      version: SHADOW_PRODUCER_VERSION,
      host: os.hostname(),
      app_id: fitnessIntegrationContract.identity.appId,
    },
    context: {
      workspace_root: FITNESS_WORKSPACE_ROOT,
      reason: snapshot.reason,
    },
    correlation: {
      ...buildCorrelationFromPayload(memberId, snapshot.snapshot),
      outbound_id: snapshot.outboundId,
    },
    payload: snapshot.snapshot,
  };
}

function buildReceiptShadowEvent(receipt: FitnessInboundReceipt): FitnessShadowEvent {
  return {
    contract_version: SHADOW_EVENT_CONTRACT_VERSION,
    event_kind: "receipt",
    event_type: receipt.receiptType,
    event_id: safeToken(receipt.receiptId),
    occurred_at: receipt.appliedAt,
    producer: {
      kind: "service",
      name: SHADOW_PRODUCER_NAME,
      version: SHADOW_PRODUCER_VERSION,
      host: os.hostname(),
      app_id: fitnessIntegrationContract.identity.appId,
    },
    context: {
      workspace_root: FITNESS_WORKSPACE_ROOT,
      reason: "receipt_ingest",
    },
    correlation: {
      ...buildCorrelationFromPayload(receipt.memberId, receipt.payload),
      source_outbound_id: receipt.sourceOutboundId,
    },
    payload: {
      receiptId: receipt.receiptId,
      actionType: receipt.actionType,
      memberId: receipt.memberId,
      appliedAt: receipt.appliedAt,
      sourceOutboundId: receipt.sourceOutboundId,
      ...receipt.payload,
    },
  };
}

function validateShadowSignal(signal: FitnessOutboundSignal): string[] {
  return [...validateSignalFixture(signal).errors];
}

function validateShadowSnapshot(snapshot: FitnessOutboundSnapshot): string[] {
  return [...validateStateSnapshotFixture(snapshot).errors];
}

function validateShadowReceipt(receipt: FitnessInboundReceipt): string[] {
  return [...validateReceiptFixture(receipt).errors];
}

function schemaRefFor(kind: FitnessShadowEventKind, eventType: string): string {
  const bucket =
    kind === "signal"
      ? "signals"
      : kind === "snapshot"
        ? "stateSnapshots"
        : "receipts";
  return `repos/fawxzzy-fitness/src/lib/ecosystem/fitness-integration-contract.ts#${bucket}.${eventType}`;
}

function buildReceipt(
  event: FitnessShadowEvent,
  validationErrors: readonly string[],
  options: {
    atlasRoot: string;
  },
): FitnessShadowReceipt {
  const { atlasRoot } = options;
  return {
    receipt_version: SHADOW_RECEIPT_VERSION,
    receipt_id: makeIdentifier("fitness-shadow-receipt"),
    recorded_at: utcNow(),
    atlas_root: normalizePathForAtlas(atlasRoot, atlasRoot),
    event,
    schema: {
      event_kind: event.event_kind,
      event_type: event.event_type,
      schema_ref: schemaRefFor(event.event_kind, event.event_type),
    },
    processing: {
      accepted: validationErrors.length === 0,
      status: validationErrors.length === 0 ? "accepted" : "rejected",
      errors: validationErrors,
      handler: {
        status: "skipped",
        reason: "shadow_mode_no_handler",
      },
    },
  };
}

async function writeReceipt(
  receipt: FitnessShadowReceipt,
  options: {
    atlasRoot: string;
    receiptRoot: string;
    eventType: string;
    eventId: string;
  },
): Promise<string> {
  const { atlasRoot, receiptRoot, eventType, eventId } = options;
  const eventDir = path.join(receiptRoot, eventType);
  await mkdir(eventDir, { recursive: true });

  const receiptPath = path.join(eventDir, `${stampNow()}-${safeToken(eventId)}.json`);
  const latestPath = path.join(eventDir, "latest.json");

  receipt.paths = {
    receipt_path: normalizePathForAtlas(receiptPath, atlasRoot),
    latest_path: normalizePathForAtlas(latestPath, atlasRoot),
  };

  const encoded = `${JSON.stringify(receipt, null, 2)}\n`;
  await writeFile(receiptPath, encoded, "utf-8");
  await writeFile(latestPath, encoded, "utf-8");

  return receipt.paths.receipt_path;
}

async function emitShadowReceipt(
  event: FitnessShadowEvent,
  validationErrors: readonly string[],
  options: FitnessShadowTelemetryOptions,
): Promise<string> {
  const { atlasRoot, receiptRoot } = resolveReceiptRoot(options);
  const receipt = buildReceipt(event, validationErrors, { atlasRoot });
  return writeReceipt(receipt, {
    atlasRoot,
    receiptRoot,
    eventType: event.event_type,
    eventId: event.event_id,
  });
}

async function emitShadowSignal(signal: FitnessOutboundSignal, options: FitnessShadowTelemetryOptions): Promise<string> {
  const errors = validateShadowSignal(signal);
  if (errors.length > 0 && options.strict !== false) {
    throw new Error(errors.join("; "));
  }
  return emitShadowReceipt(buildSignalShadowEvent(signal), errors, options);
}

async function emitShadowSnapshot(snapshot: FitnessOutboundSnapshot, options: FitnessShadowTelemetryOptions): Promise<string> {
  const errors = validateShadowSnapshot(snapshot);
  if (errors.length > 0 && options.strict !== false) {
    throw new Error(errors.join("; "));
  }
  return emitShadowReceipt(buildSnapshotShadowEvent(snapshot), errors, options);
}

async function emitShadowReceiptEvent(receipt: FitnessInboundReceipt, options: FitnessShadowTelemetryOptions): Promise<string> {
  const errors = validateShadowReceipt(receipt);
  if (errors.length > 0 && options.strict !== false) {
    throw new Error(errors.join("; "));
  }
  return emitShadowReceipt(buildReceiptShadowEvent(receipt), errors, options);
}

export function mergeFitnessShadowTelemetryResults(
  ...results: readonly FitnessShadowTelemetryResult[]
): FitnessShadowTelemetryResult {
  return {
    receiptRefs: results.flatMap((result) => [...result.receiptRefs]),
    errors: results.flatMap((result) => [...result.errors]),
  };
}

export async function emitFitnessShadowTelemetryBatch(input: {
  readonly signals?: readonly FitnessOutboundSignal[];
  readonly snapshots?: readonly FitnessOutboundSnapshot[];
  readonly receipts?: readonly FitnessInboundReceipt[];
  readonly options?: FitnessShadowTelemetryOptions;
}): Promise<FitnessShadowTelemetryResult> {
  const receiptRefs: string[] = [];
  const errors: string[] = [];
  const options = input.options ?? {};

  for (const signal of input.signals ?? []) {
    try {
      receiptRefs.push(await emitShadowSignal(signal, options));
    } catch (error) {
      errors.push(`${signal.signalType}: ${error instanceof Error ? error.message : "Unknown shadow telemetry error"}`);
    }
  }

  for (const snapshot of input.snapshots ?? []) {
    try {
      receiptRefs.push(await emitShadowSnapshot(snapshot, options));
    } catch (error) {
      errors.push(`${snapshot.snapshotType}: ${error instanceof Error ? error.message : "Unknown shadow telemetry error"}`);
    }
  }

  for (const receipt of input.receipts ?? []) {
    try {
      receiptRefs.push(await emitShadowReceiptEvent(receipt, options));
    } catch (error) {
      errors.push(`${receipt.receiptType}: ${error instanceof Error ? error.message : "Unknown shadow telemetry error"}`);
    }
  }

  return {
    receiptRefs,
    errors,
  };
}
