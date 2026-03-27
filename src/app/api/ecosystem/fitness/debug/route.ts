import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fitnessIntegrationClient, type FitnessInboundReceipt } from "@/lib/ecosystem/fitness-integration-client";
import { publishFitnessIntegrationStateForMember } from "@/lib/ecosystem/fitness-integration-server";
import { fitnessSignalFixtures } from "@/lib/ecosystem/fixtures/signals";
import { fitnessStateSnapshotFixtures } from "@/lib/ecosystem/fixtures/state-snapshots";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const debugState = fitnessIntegrationClient.getDebugState(user.id);

  return NextResponse.json({
    memberId: user.id,
    debugState,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  const command = typeof body?.command === "string" ? body.command : "";

  if (command === "replay-fixtures") {
    const now = new Date();

    for (const fixture of fitnessSignalFixtures) {
      fitnessIntegrationClient.packageSignal({
        memberId: user.id,
        signalType: fixture.signalType,
        payload: {
          ...fixture.payload,
          memberId: user.id,
        },
        reason: "manual_debug",
        emittedAt: now,
      });
    }

    const published = await publishFitnessIntegrationStateForMember({
      memberId: user.id,
      reason: "manual_debug",
      now,
    });

    return NextResponse.json({
      ok: true,
      replayedSignals: fitnessSignalFixtures.length,
      availableSnapshotFixtures: fitnessStateSnapshotFixtures.length,
      sourceState: published.sourceState,
      debugState: fitnessIntegrationClient.getDebugState(user.id),
    });
  }

  if (command === "ingest-receipt") {
    const receipt = body?.receipt as FitnessInboundReceipt | undefined;
    if (!receipt?.receiptId || !receipt?.receiptType || !receipt?.sourceOutboundId) {
      return NextResponse.json({ ok: false, error: "Missing required receipt fields" }, { status: 400 });
    }

    const normalizedReceipt: FitnessInboundReceipt = {
      ...receipt,
      memberId: user.id,
    };

    fitnessIntegrationClient.ingestReceipt(normalizedReceipt);

    return NextResponse.json({
      ok: true,
      debugState: fitnessIntegrationClient.getDebugState(user.id),
    });
  }

  if (command === "refresh-live-state") {
    const published = await publishFitnessIntegrationStateForMember({
      memberId: user.id,
      reason: "manual_debug",
      now: new Date(),
    });

    return NextResponse.json({
      ok: true,
      sourceState: published.sourceState,
      outboundSignals: published.outboundSignals,
      outboundSnapshots: published.snapshotExport.exported,
      debugState: fitnessIntegrationClient.getDebugState(user.id),
    });
  }

  return NextResponse.json({ ok: false, error: "Unknown command" }, { status: 400 });
}
