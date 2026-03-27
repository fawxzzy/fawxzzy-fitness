export type EcosystemRouteTarget = "playbook" | "lifeline" | "human-review";

export interface EcosystemRoutingMetadata {
  readonly target: EcosystemRouteTarget;
  readonly channel: string;
  readonly priority: "low" | "normal" | "high";
  readonly maxDeliveryLatencySeconds: number;
}

export interface SignalContract<TSignalType extends string = string> {
  readonly type: TSignalType;
  readonly version: 1;
  readonly description: string;
  readonly payloadSchema: Readonly<Record<string, string>>;
  readonly routing: EcosystemRoutingMetadata;
  readonly requiresPlaybookIngestion: true;
}

export interface StateSnapshotContract<TSnapshotType extends string = string> {
  readonly type: TSnapshotType;
  readonly version: 1;
  readonly description: string;
  readonly inspectableFields: readonly string[];
  readonly freshnessSlaSeconds: number;
}

export interface ActionInputField {
  readonly name: string;
  readonly type: "string" | "number" | "boolean";
  readonly required: boolean;
  readonly description: string;
  readonly min?: number;
  readonly max?: number;
  readonly allowedValues?: readonly string[];
}

export interface BoundedActionContract<TActionType extends string = string, TReceiptType extends string = string> {
  readonly type: TActionType;
  readonly version: 1;
  readonly description: string;
  readonly inputSchema: readonly ActionInputField[];
  readonly receiptType: TReceiptType;
  readonly constraints: readonly string[];
  readonly routing: EcosystemRoutingMetadata;
}

export interface ReceiptContract<TReceiptType extends string = string> {
  readonly type: TReceiptType;
  readonly version: 1;
  readonly description: string;
  readonly requiredFields: readonly string[];
}

export interface EcosystemAppIdentity {
  readonly appId: string;
  readonly appName: string;
  readonly appVersion: string;
  readonly ecosystemRole: "sensor-actuator";
}

export interface EcosystemIntegrationContract {
  readonly identity: EcosystemAppIdentity;
  readonly governance: {
    readonly loop: "signal->plan->action->receipt";
    readonly seam: "playbook-lifeline";
    readonly bypassAllowed: false;
  };
  readonly signals: readonly SignalContract[];
  readonly stateSnapshots: readonly StateSnapshotContract[];
  readonly actions: readonly BoundedActionContract[];
  readonly receipts: readonly ReceiptContract[];
}

export interface DeterministicSignalFixture<TSignalType extends string = string> {
  readonly fixtureId: string;
  readonly emittedAt: string;
  readonly appId: string;
  readonly signalType: TSignalType;
  readonly routing: EcosystemRoutingMetadata;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface DeterministicStateSnapshotFixture<TSnapshotType extends string = string> {
  readonly fixtureId: string;
  readonly capturedAt: string;
  readonly appId: string;
  readonly snapshotType: TSnapshotType;
  readonly snapshot: Readonly<Record<string, string | number | boolean>>;
}

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}
