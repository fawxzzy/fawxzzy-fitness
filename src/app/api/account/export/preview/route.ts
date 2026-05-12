import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildAccountWorkoutExportPayload,
  type AccountWorkoutExportFileType,
  type AccountWorkoutExportOptions,
  type AccountWorkoutExportScope,
} from "@/lib/account-workout-export";
import { buildAccountWorkoutExportPreview } from "@/lib/account-workout-export-preview";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isValidFileType(value: unknown): value is AccountWorkoutExportFileType {
  return value === "csv" || value === "json" || value === "xlsx";
}

function isValidScope(value: unknown): value is AccountWorkoutExportScope {
  return value === "all" || value === "completed_only" || value === "current_routine";
}

export async function POST(request: Request) {
  let payload: {
    fileType?: unknown;
    scope?: unknown;
    dateFrom?: unknown;
    dateTo?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid export preview request." }, { status: 400 });
  }

  if (!isValidFileType(payload.fileType)) {
    return NextResponse.json({ ok: false, error: "Choose a supported export file type." }, { status: 400 });
  }

  if (!isValidScope(payload.scope)) {
    return NextResponse.json({ ok: false, error: "Choose a supported export scope." }, { status: 400 });
  }

  try {
    const user = await requireUser();
    const options: AccountWorkoutExportOptions = {
      fileType: payload.fileType,
      exportName: null,
      scope: payload.scope,
      dateFrom: typeof payload.dateFrom === "string" ? payload.dateFrom : null,
      dateTo: typeof payload.dateTo === "string" ? payload.dateTo : null,
    };
    const exportPayload = await buildAccountWorkoutExportPayload({
      supabase: supabaseServer(),
      userId: user.id,
      options,
    });

    return NextResponse.json({
      ok: true,
      preview: buildAccountWorkoutExportPreview({
        payload: exportPayload,
        options,
      }),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load export preview right now.",
    }, { status: 400 });
  }
}
