import {
  fitnessIntegrationClient,
  type FitnessOutboundSignal,
} from "./fitness-integration-client.ts";
import { buildFitnessGrowthShadowReport } from "./fitness-growth-shadow.ts";
import {
  emitFitnessShadowTelemetryBatch,
  type FitnessShadowTelemetryResult,
} from "./fitness-shadow-events.ts";

const PILOT_EVIDENCE_SIGNAL_TYPES = [
  "pilot_shadow_impression_logged",
  "pilot_shadow_click_logged",
  "pilot_placement_dismissed",
  "pilot_support_complaint_opened",
  "pilot_activation_retained",
] as const;

export type FitnessPilotEvidenceSignalType = (typeof PILOT_EVIDENCE_SIGNAL_TYPES)[number];

export function isFitnessPilotEvidenceSignalType(value: string): value is FitnessPilotEvidenceSignalType {
  return (PILOT_EVIDENCE_SIGNAL_TYPES as readonly string[]).includes(value);
}

export function buildFitnessPilotEvidenceSignal(input: {
  memberId: string;
  signalType: FitnessPilotEvidenceSignalType;
  sourceOutboundId: string;
  occurredAt: Date | string;
  placementId?: string;
  surfaceId?: string;
  destinationPath?: string;
  cohortId?: string;
  dismissalReasonCode?: string;
  complaintCode?: string;
  retentionWindowDays?: number;
}): FitnessOutboundSignal {
  const occurredAtIso = input.occurredAt instanceof Date ? input.occurredAt.toISOString() : new Date(input.occurredAt).toISOString();
  const placementId = input.placementId ?? "recovery_reset_shadow_placement";
  const surfaceId = input.surfaceId ?? "today_recovery_banner";

  if (input.signalType === "pilot_shadow_impression_logged") {
    return fitnessIntegrationClient.packageSignal({
      memberId: input.memberId,
      signalType: input.signalType,
      reason: "pilot_measurement",
      emittedAt: occurredAtIso,
      payload: {
        memberId: input.memberId,
        sourceOutboundId: input.sourceOutboundId,
        placementId,
        surfaceId,
        cohortId: input.cohortId ?? "unknown_shadow_cohort",
        observedAt: occurredAtIso,
      },
    });
  }

  if (input.signalType === "pilot_shadow_click_logged") {
    return fitnessIntegrationClient.packageSignal({
      memberId: input.memberId,
      signalType: input.signalType,
      reason: "pilot_measurement",
      emittedAt: occurredAtIso,
      payload: {
        memberId: input.memberId,
        sourceOutboundId: input.sourceOutboundId,
        placementId,
        destinationPath: input.destinationPath ?? "/today",
        cohortId: input.cohortId ?? "unknown_shadow_cohort",
        clickedAt: occurredAtIso,
      },
    });
  }

  if (input.signalType === "pilot_placement_dismissed") {
    return fitnessIntegrationClient.packageSignal({
      memberId: input.memberId,
      signalType: input.signalType,
      reason: "pilot_measurement",
      emittedAt: occurredAtIso,
      payload: {
        memberId: input.memberId,
        sourceOutboundId: input.sourceOutboundId,
        placementId,
        dismissalReasonCode: input.dismissalReasonCode ?? "member_dismissed",
        dismissedAt: occurredAtIso,
      },
    });
  }

  if (input.signalType === "pilot_support_complaint_opened") {
    return fitnessIntegrationClient.packageSignal({
      memberId: input.memberId,
      signalType: input.signalType,
      reason: "pilot_measurement",
      emittedAt: occurredAtIso,
      payload: {
        memberId: input.memberId,
        sourceOutboundId: input.sourceOutboundId,
        placementId,
        complaintCode: input.complaintCode ?? "member_support_ticket",
        openedAt: occurredAtIso,
      },
    });
  }

  return fitnessIntegrationClient.packageSignal({
    memberId: input.memberId,
    signalType: "pilot_activation_retained",
    reason: "pilot_measurement",
    emittedAt: occurredAtIso,
    payload: {
      memberId: input.memberId,
      sourceOutboundId: input.sourceOutboundId,
      placementId,
      retentionWindowDays: input.retentionWindowDays ?? 7,
      retainedAt: occurredAtIso,
    },
  });
}

export async function recordFitnessPilotEvidenceSignal(input: Parameters<typeof buildFitnessPilotEvidenceSignal>[0]): Promise<{
  signal: FitnessOutboundSignal;
  shadowTelemetry: FitnessShadowTelemetryResult;
}> {
  return recordFitnessPilotEvidenceSignalWithOptions({
    ...input,
  });
}

export async function recordFitnessPilotEvidenceSignalWithOptions(input: Parameters<typeof buildFitnessPilotEvidenceSignal>[0] & {
  atlasRoot?: string;
  receiptRoot?: string;
}): Promise<{
  signal: FitnessOutboundSignal;
  shadowTelemetry: FitnessShadowTelemetryResult;
}> {
  const signal = buildFitnessPilotEvidenceSignal(input);
  const shadowTelemetry = await emitFitnessShadowTelemetryBatch({
    signals: [signal],
    options: {
      atlasRoot: input.atlasRoot,
      receiptRoot: input.receiptRoot,
    },
  });

  return {
    signal,
    shadowTelemetry,
  };
}

export async function backfillFitnessPilotShadowImpressions(input: {
  receiptRoot: string;
  atlasRoot?: string;
}): Promise<{
  attempted_count: number;
  emitted_count: number;
  shadowTelemetry: FitnessShadowTelemetryResult;
}> {
  const growthReport = buildFitnessGrowthShadowReport({
    receiptRoot: input.receiptRoot,
  });
  const shadowPlacedCandidates = growthReport.candidates.filter((candidate) => candidate.placement_status === "shadow_placed");

  const signals = shadowPlacedCandidates.map((candidate) =>
    buildFitnessPilotEvidenceSignal({
      memberId: candidate.member_id,
      signalType: "pilot_shadow_impression_logged",
      sourceOutboundId: candidate.source_outbound_id,
      occurredAt: candidate.trigger_occurred_at,
      placementId: candidate.placement_id,
      surfaceId: growthReport.placement_contract.surface_id,
      cohortId: candidate.cohort_id,
    }),
  );

  const shadowTelemetry = await emitFitnessShadowTelemetryBatch({
    signals,
    options: {
      atlasRoot: input.atlasRoot,
      receiptRoot: input.receiptRoot,
    },
  });

  return {
    attempted_count: shadowPlacedCandidates.length,
    emitted_count: shadowTelemetry.receiptRefs.length,
    shadowTelemetry,
  };
}
