import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import {
  buildAccountWorkoutExportFilename,
  buildAccountWorkoutExportPayload,
  buildAccountWorkoutExportJsonDocument,
  serializeAccountWorkoutExportCsv,
  buildAccountWorkoutExportCsvTables,
  buildAccountWorkoutExportWorkbookBuffer,
  getAccountWorkoutExportContentType,
  loadAccountWorkoutExportSettings,
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
  return value === "all" || value === "history" || value === "routines";
}

export async function POST(request: Request) {
  // Authenticate first and outside any try block: a missing session is a 401, not a 400 with the text "NEXT_REDIRECT".
  const auth = await resolveApiUser();
  if (!auth.ok) {
    return auth.response;
  }
  const { user } = auth;

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
    const options: AccountWorkoutExportOptions = {
      fileType: payload.fileType,
      exportName: typeof payload.exportName === "string" ? payload.exportName : null,
      scope: payload.scope,
      dateFrom: typeof payload.dateFrom === "string" ? payload.dateFrom : null,
      dateTo: typeof payload.dateTo === "string" ? payload.dateTo : null,
    };
    // One cookie-bound (RLS) client for every read; the user id always comes from the session, never the request body.
    const supabase = await supabaseServer();
    const exportPayload = await buildAccountWorkoutExportPayload({
      supabase,
      userId: user.id,
      options,
    });
    const filename = buildAccountWorkoutExportFilename(options);

    if (options.fileType === "csv") {
      const body = serializeAccountWorkoutExportCsv(buildAccountWorkoutExportCsvTables(exportPayload));
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": getAccountWorkoutExportContentType(options.fileType),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (options.fileType === "xlsx") {
      const body = await buildAccountWorkoutExportWorkbookBuffer(exportPayload);
      return new NextResponse(new Blob([new Uint8Array(body)]), {
        status: 200,
        headers: {
          "Content-Type": getAccountWorkoutExportContentType(options.fileType),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const settings = await loadAccountWorkoutExportSettings({ supabase, userId: user.id });
    return new NextResponse(`${JSON.stringify(buildAccountWorkoutExportJsonDocument(exportPayload, { settings }), null, 2)}\n`, {
      status: 200,
      headers: {
        "Content-Type": getAccountWorkoutExportContentType(options.fileType),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to export workout data right now.",
    }, { status: 400 });
  }
}
