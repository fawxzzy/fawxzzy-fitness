import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  buildAccountWorkoutExportPayload,
  type AccountWorkoutExportFileType,
  type AccountWorkoutExportOptions,
  type AccountWorkoutExportScope,
} from "@/lib/account-workout-export";
import { buildAccountWorkoutExportPreview } from "@/lib/account-workout-export-preview";
import { filterQaLlelRows, resolveShowQaLlelDataPreference } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/db";

export const dynamic = "force-dynamic";

function isValidFileType(value: unknown): value is AccountWorkoutExportFileType {
  return value === "csv" || value === "json" || value === "xlsx";
}

function isValidScope(value: unknown): value is AccountWorkoutExportScope {
  return value === "all" || value === "history" || value === "routines";
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
    const supabase = supabaseServer();
    const options: AccountWorkoutExportOptions = {
      fileType: payload.fileType,
      exportName: null,
      scope: payload.scope,
      dateFrom: typeof payload.dateFrom === "string" ? payload.dateFrom : null,
      dateTo: typeof payload.dateTo === "string" ? payload.dateTo : null,
    };
    const exportPayload = await buildAccountWorkoutExportPayload({
      supabase,
      userId: user.id,
      options,
    });
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("show_qa_llel_data, user_kind")
      .eq("id", user.id)
      .limit(1);
    const profileRow = Array.isArray(profileRows) ? profileRows[0] as Pick<ProfileRow, "show_qa_llel_data" | "user_kind"> | undefined : undefined;
    const showQaLlelData = resolveShowQaLlelDataPreference({
      show_qa_llel_data: typeof profileRow?.show_qa_llel_data === "boolean" ? profileRow.show_qa_llel_data : null,
      user_kind: profileRow?.user_kind === "human" || profileRow?.user_kind === "automation" || profileRow?.user_kind === "unknown"
        ? profileRow.user_kind
        : "unknown",
    });
    const routineNameById = new Map(exportPayload.routines.map((routine) => [routine.id, routine.name ?? ""]));
    const completedSessions = exportPayload.sessions.filter((session) => session.status === "completed");
    const visibleCompletedSessionRows = showQaLlelData
      ? completedSessions
      : filterQaLlelRows(
        completedSessions,
        (session) => [
          session.routine_id ? routineNameById.get(session.routine_id) ?? session.name : session.name,
          session.day_name_override ?? session.routine_day_name,
        ],
      );
    const visibleCompletedSessions = visibleCompletedSessionRows.length;
    const hiddenQaCompletedSessions = Math.max(0, completedSessions.length - visibleCompletedSessions);
    const visibleCompletedSessionIdSet = new Set(visibleCompletedSessionRows.map((session) => session.id));
    const visibleSessionExerciseIdSet = new Set(
      exportPayload.sessionExercises
        .filter((sessionExercise) => visibleCompletedSessionIdSet.has(sessionExercise.session_id))
        .map((sessionExercise) => sessionExercise.id),
    );
    const visibleSessionExercises = visibleSessionExerciseIdSet.size;
    const visibleSets = exportPayload.sets.filter((set) => visibleSessionExerciseIdSet.has(set.session_exercise_id)).length;
    const preview = buildAccountWorkoutExportPreview({
      payload: exportPayload,
      options,
    });
    preview.counts = {
      ...preview.counts,
      visibleCompletedSessions,
      hiddenQaCompletedSessions,
      visibleSessionExercises,
      visibleSets,
    };

    return NextResponse.json({
      ok: true,
      preview,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load export preview right now.",
    }, { status: 400 });
  }
}
