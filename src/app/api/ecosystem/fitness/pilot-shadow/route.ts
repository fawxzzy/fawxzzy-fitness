import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordFitnessPilotEvidenceSignal } from "@/lib/ecosystem/fitness-pilot-evidence";

export const dynamic = "force-dynamic";

type PilotShadowEventType = "impression" | "click" | "dismiss";

function isPilotShadowEventType(value: unknown): value is PilotShadowEventType {
  return value === "impression" || value === "click" || value === "dismiss";
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  const eventType = body?.eventType;
  const sourceOutboundId = typeof body?.sourceOutboundId === "string" ? body.sourceOutboundId.trim() : "";

  if (!isPilotShadowEventType(eventType)) {
    return NextResponse.json({ ok: false, error: "Unknown pilot shadow event type" }, { status: 400 });
  }

  if (!sourceOutboundId) {
    return NextResponse.json({ ok: false, error: "Missing sourceOutboundId" }, { status: 400 });
  }

  const placementId = typeof body?.placementId === "string" && body.placementId.length > 0
    ? body.placementId
    : "recovery_reset_shadow_placement";
  const surfaceId = typeof body?.surfaceId === "string" && body.surfaceId.length > 0
    ? body.surfaceId
    : "today_recovery_banner";
  const cohortId = typeof body?.cohortId === "string" && body.cohortId.length > 0
    ? body.cohortId
    : "unknown_shadow_cohort";
  const destinationPath = typeof body?.destinationPath === "string" && body.destinationPath.length > 0
    ? body.destinationPath
    : "/today";
  const dismissalReasonCode = typeof body?.dismissalReasonCode === "string" && body.dismissalReasonCode.length > 0
    ? body.dismissalReasonCode
    : "member_dismissed";

  const signalType = eventType === "impression"
    ? "pilot_shadow_impression_logged"
    : eventType === "click"
      ? "pilot_shadow_click_logged"
      : "pilot_placement_dismissed";

  const recorded = await recordFitnessPilotEvidenceSignal({
    memberId: user.id,
    signalType,
    sourceOutboundId,
    occurredAt: new Date(),
    placementId,
    surfaceId,
    cohortId,
    destinationPath,
    dismissalReasonCode,
  });

  return NextResponse.json({
    ok: true,
    signalType: recorded.signal.signalType,
    receiptRefs: recorded.shadowTelemetry.receiptRefs,
    errors: recorded.shadowTelemetry.errors,
  });
}
