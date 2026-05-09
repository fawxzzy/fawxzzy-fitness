import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildAccountWorkoutExportFilename,
  buildAccountWorkoutExportPayload,
  serializeAccountWorkoutExportCsv,
  buildAccountWorkoutExportCsvRows,
  buildAccountWorkoutExportWorkbookBuffer,
  getAccountWorkoutExportContentType,
  type AccountWorkoutExportFileType,
  type AccountWorkoutExportOptions,
  type AccountWorkoutExportScope,
} from "@/lib/account-workout-export";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isValidFileType(value: unknown): value is AccountWorkoutExportFileType | "xlsx" {
  return value === "csv" || value === "json" || value === "xlsx";
}

function isValidScope(value: unknown): value is AccountWorkoutExportScope {
  return value === "all" || value === "completed_only" || value === "current_routine";
}

export async function POST(request: Request) {
  let payload: {
    fileType?: unknown;
    exportName?: unknown;
    scope?: unknown;
    dateFrom?: unknown;
    dateTo?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid export request." }, { status: 400 });
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
      exportName: typeof payload.exportName === "string" ? payload.exportName : null,
      scope: payload.scope,
      dateFrom: typeof payload.dateFrom === "string" ? payload.dateFrom : null,
      dateTo: typeof payload.dateTo === "string" ? payload.dateTo : null,
    };
    const exportPayload = await buildAccountWorkoutExportPayload({
      supabase: supabaseServer(),
      userId: user.id,
      options,
    });
    const filename = buildAccountWorkoutExportFilename(options);

    if (options.fileType === "csv") {
      const body = serializeAccountWorkoutExportCsv(buildAccountWorkoutExportCsvRows(exportPayload));
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": getAccountWorkoutExportContentType(options.fileType),
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (options.fileType === "xlsx") {
      const body = buildAccountWorkoutExportWorkbookBuffer(exportPayload);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": getAccountWorkoutExportContentType(options.fileType),
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return new NextResponse(`${JSON.stringify(exportPayload, null, 2)}\n`, {
      status: 200,
      headers: {
        "Content-Type": getAccountWorkoutExportContentType(options.fileType),
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to export workout data right now.",
    }, { status: 400 });
  }
}
