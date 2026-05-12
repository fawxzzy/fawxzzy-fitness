import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getFitnessLegacySnapshotSignoffCounts } from "@/lib/migration/fitness-legacy-contract";
import {
  exportFitnessLegacySnapshot,
} from "@/lib/migration/fitness-legacy-bridge";

export const dynamic = "force-dynamic";

type ExportRequest =
  | {
      legacyEmail: string;
      legacyPassword: string;
      legacyAccessToken?: undefined;
    }
  | {
      legacyEmail?: undefined;
      legacyPassword?: undefined;
      legacyAccessToken: string;
    };

function isValidExportRequest(value: unknown): value is ExportRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ExportRequest>;
  const hasCredentials =
    typeof payload.legacyEmail === "string" && typeof payload.legacyPassword === "string";
  const hasToken = typeof payload.legacyAccessToken === "string";

  return hasCredentials || hasToken;
}

export async function POST(request: Request) {
  let payload: ExportRequest;

  try {
    const raw = (await request.json()) as unknown;
    if (!isValidExportRequest(raw)) {
      return NextResponse.json(
        { ok: false, error: "Provide legacy credentials or a legacy access token." },
        { status: 400 },
      );
    }

    payload = raw;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  try {
    await requireUser();
    const snapshot = await exportFitnessLegacySnapshot(payload);

    return NextResponse.json({
      ok: true,
      data: {
        snapshot,
        counts: getFitnessLegacySnapshotSignoffCounts(snapshot),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to export a legacy snapshot right now.",
      },
      { status: 400 },
    );
  }
}
