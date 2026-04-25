import { headers } from "next/headers";
import { LiveExerciseInfoPreview } from "@/app/dev/exercise-info-live/LiveExerciseInfoPreview";
import { resolveExerciseInfoImages, type ExerciseInfoExercise, type ExerciseInfoPayload } from "@/lib/exercise-info";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function ErrorState({ message }: { message: string }) {
  return (
    <main className="app-page-scroll min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-4 py-5 text-sm text-[rgb(var(--text)/0.92)]">
        {message}
      </div>
    </main>
  );
}

type ExerciseInfoApiSuccess = {
  ok: true;
  payload: ExerciseInfoPayload;
};

type DevExerciseRow = {
  id: string;
  name: string;
  how_to_short: string | null;
  primary_muscle: string | null;
  movement_pattern: string | null;
  equipment: string | null;
  image_howto_path: string | null;
  measurement_type: string | null;
  default_unit: string | null;
};

type DevExerciseStatsRow = {
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
};

type DevHistoricalSetRow = {
  set_index: number | null;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: string | null;
  calories: number | null;
  weight_unit: string | null;
  session_exercise:
    | {
        session_id: string;
        exercise_id: string;
        session:
          | {
              performed_at: string;
              status: string;
            }
          | Array<{
              performed_at: string;
              status: string;
            }>
          | null;
      }
    | Array<{
        session_id: string;
        exercise_id: string;
        session:
          | {
              performed_at: string;
              status: string;
            }
          | Array<{
              performed_at: string;
              status: string;
            }>
          | null;
      }>
    | null;
};

function formatDateLabel(dateValue: string | null) {
  if (!dateValue) return "No sessions";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "No sessions";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatWeightUnit(unit: string | null | undefined) {
  if (unit === "lbs") return "lb";
  return unit ?? "lb";
}

function formatWholeNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)}`;
}

function formatWeight(value: number | null | undefined, unit: string | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${Math.round(value)} ${formatWeightUnit(unit)}`;
}

function formatSetSummary(weight: number | null | undefined, reps: number | null | undefined, unit: string | null | undefined) {
  if (typeof weight === "number" && Number.isFinite(weight) && typeof reps === "number" && Number.isFinite(reps)) {
    return `${Math.round(weight)} ${formatWeightUnit(unit)} x ${Math.round(reps)}`;
  }
  if (typeof reps === "number" && Number.isFinite(reps)) {
    return `${Math.round(reps)} reps`;
  }
  return "-";
}

function estimateOneRepMax(weight: number | null | undefined, reps: number | null | undefined) {
  if (typeof weight !== "number" || !Number.isFinite(weight) || typeof reps !== "number" || !Number.isFinite(reps) || reps <= 0) {
    return null;
  }
  return weight * (1 + (reps / 30));
}

function normalizeSession(row: DevHistoricalSetRow) {
  const sessionExercise = Array.isArray(row.session_exercise) ? (row.session_exercise[0] ?? null) : row.session_exercise;
  const session = Array.isArray(sessionExercise?.session) ? (sessionExercise?.session[0] ?? null) : sessionExercise?.session;

  if (!sessionExercise?.session_id || !session?.performed_at || session.status !== "completed") {
    return null;
  }

  return {
    sessionId: sessionExercise.session_id,
    performedAt: session.performed_at,
    setIndex: row.set_index ?? 0,
    weight: row.weight ?? null,
    reps: row.reps ?? null,
    weightUnit: row.weight_unit ?? null,
  };
}

async function loadLiveExercisePreview(userId: string, exerciseId: string) {
  const admin = supabaseAdmin();

  const [{ data: exerciseRow, error: exerciseError }, { data: statsRow, error: statsError }, { data: rawRows, error: rowsError }] = await Promise.all([
    admin
      .from("exercises")
      .select("id, name, how_to_short, primary_muscle, movement_pattern, equipment, image_howto_path, measurement_type, default_unit")
      .eq("id", exerciseId)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .maybeSingle<DevExerciseRow>(),
    admin
      .from("exercise_stats")
      .select("last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .maybeSingle<DevExerciseStatsRow>(),
    admin
      .from("sets")
      .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
      .eq("user_id", userId)
      .eq("session_exercise.user_id", userId)
      .eq("session_exercise.exercise_id", exerciseId)
      .eq("session_exercise.session.status", "completed")
      .returns<DevHistoricalSetRow[]>(),
  ]);

  if (exerciseError) {
    throw new Error(`Failed to load exercise row: ${exerciseError.message}`);
  }
  if (statsError) {
    throw new Error(`Failed to load exercise stats row: ${statsError.message}`);
  }
  if (rowsError) {
    throw new Error(`Failed to load historical rows: ${rowsError.message}`);
  }
  if (!exerciseRow) {
    return null;
  }

  const normalizedRows = (rawRows ?? [])
    .map(normalizeSession)
    .filter((row): row is NonNullable<ReturnType<typeof normalizeSession>> => Boolean(row))
    .sort((a, b) => {
      if (b.performedAt !== a.performedAt) {
        return b.performedAt.localeCompare(a.performedAt);
      }
      return b.setIndex - a.setIndex;
    });

  const sessionsById = new Map<string, typeof normalizedRows>();
  for (const row of normalizedRows) {
    const existing = sessionsById.get(row.sessionId) ?? [];
    existing.push(row);
    sessionsById.set(row.sessionId, existing);
  }

  const sessionSummaries = Array.from(sessionsById.values())
    .map((rows) => {
      const sortedRows = [...rows].sort((a, b) => {
        const aScore = estimateOneRepMax(a.weight, a.reps) ?? 0;
        const bScore = estimateOneRepMax(b.weight, b.reps) ?? 0;
        return bScore - aScore;
      });
      const top = sortedRows[0] ?? rows[0];
      return {
        performedAt: rows[0]?.performedAt ?? null,
        setCount: rows.length,
        summary: formatSetSummary(top?.weight ?? null, top?.reps ?? null, top?.weightUnit ?? exerciseRow.default_unit),
      };
    })
    .sort((a, b) => String(b.performedAt ?? "").localeCompare(String(a.performedAt ?? "")));

  const lastSummary = formatSetSummary(statsRow?.last_weight ?? null, statsRow?.last_reps ?? null, statsRow?.last_unit ?? exerciseRow.default_unit);
  const bestSummary = formatSetSummary(statsRow?.pr_weight ?? null, statsRow?.pr_reps ?? null, statsRow?.last_unit ?? exerciseRow.default_unit);
  const totalLoad4w = normalizedRows
    .filter((row) => {
      const performedAt = new Date(row.performedAt).getTime();
      return Number.isFinite(performedAt) && performedAt >= (Date.now() - (28 * 24 * 60 * 60 * 1000));
    })
    .reduce((sum, row) => sum + ((row.weight ?? 0) * (row.reps ?? 0)), 0);

  const unresolvedExercise: ExerciseInfoExercise = {
    id: exerciseRow.id,
    exercise_id: exerciseRow.id,
    name: exerciseRow.name,
    primary_muscle: exerciseRow.primary_muscle,
    equipment: exerciseRow.equipment,
    movement_pattern: exerciseRow.movement_pattern,
    image_howto_path: exerciseRow.image_howto_path,
    how_to_short: exerciseRow.how_to_short,
    image_icon_path: null,
    slug: null,
    measurement_type: exerciseRow.measurement_type,
    default_unit: exerciseRow.default_unit,
  };

  let exercise = unresolvedExercise;
  try {
    exercise = resolveExerciseInfoImages(unresolvedExercise);
  } catch {
    exercise = unresolvedExercise;
  }

  const stats: ExerciseInfoPayload["stats"] = {
    exercise_id: exerciseRow.id,
    kind: "strength" as const,
    presentationKind: "strength" as const,
    recent: {
      lastPerformedAt: statsRow?.last_performed_at ?? sessionSummaries[0]?.performedAt ?? null,
      lastSummary,
    },
    totals: {
      sessions: sessionSummaries.length,
      sets: normalizedRows.length,
    },
    bests: {
      ...(typeof statsRow?.pr_weight === "number" ? { bestWeight: statsRow.pr_weight } : {}),
      ...(typeof statsRow?.pr_reps === "number" ? { bestRepsAtBestWeight: statsRow.pr_reps } : {}),
      ...(bestSummary ? { bestSetSummary: bestSummary } : {}),
    },
    prLabel: "Load PR",
    prCount: typeof statsRow?.pr_weight === "number" ? 1 : 0,
    quickMetrics: [
      { label: "Last", value: formatDateLabel(statsRow?.last_performed_at ?? sessionSummaries[0]?.performedAt ?? null), timeframe: lastSummary },
      { label: "Best Set", value: bestSummary, timeframe: typeof statsRow?.pr_weight === "number" ? "Load PR" : null },
      { label: "PRs", value: typeof statsRow?.pr_weight === "number" ? "1" : "0", timeframe: typeof statsRow?.pr_weight === "number" ? "Load PR" : "No PRs yet" },
      { label: "Sessions", value: formatWholeNumber(sessionSummaries.length), timeframe: `${normalizedRows.length} sets logged` },
    ],
    performanceMetrics: [
      { label: "Top Set", value: bestSummary },
      { label: "E1RM", value: formatWeight(statsRow?.pr_est_1rm ?? estimateOneRepMax(statsRow?.pr_weight ?? null, statsRow?.pr_reps ?? null), exerciseRow.default_unit) },
      { label: "4W Load", value: formatWeight(totalLoad4w, exerciseRow.default_unit) },
      { label: "Last", value: formatDateLabel(statsRow?.last_performed_at ?? sessionSummaries[0]?.performedAt ?? null), timeframe: lastSummary },
    ],
    progress: {
      metrics: [
        { label: "Best Weight", value: formatWeight(statsRow?.pr_weight ?? null, exerciseRow.default_unit) },
        { label: "Last Reps", value: formatWholeNumber(statsRow?.last_reps ?? null), timeframe: "Recent top set" },
        { label: "Session Count", value: formatWholeNumber(sessionSummaries.length), timeframe: `${normalizedRows.length} total sets` },
      ],
      performances: sessionSummaries.slice(0, 4).map((entry) => ({
        label: formatDateLabel(entry.performedAt),
        value: entry.summary,
        context: `${entry.setCount} sets`,
      })),
    },
  };

  return { exercise, stats };
}

function renderLiveExerciseScreen(payload: ExerciseInfoApiSuccess["payload"]) {
  return <LiveExerciseInfoPreview exercise={payload.exercise} stats={payload.stats} />;
}

export default async function DevExerciseInfoLivePage({
  searchParams,
}: {
  searchParams?: {
    access_token?: string;
    exerciseId?: string;
    userId?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    return <ErrorState message="Not found." />;
  }

  const accessToken = searchParams?.access_token?.trim() ?? "";
  const exerciseId = searchParams?.exerciseId?.trim() ?? "";
  const explicitUserId = searchParams?.userId?.trim() ?? "";

  if (!exerciseId) {
    return <ErrorState message="Missing exercise id." />;
  }

  if (accessToken) {
    const headerStore = headers();
    const host = headerStore.get("host") ?? "127.0.0.1:3000";
    const protocol = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    const response = await fetch(`${protocol}://${host}/api/exercise-info/${encodeURIComponent(exerciseId)}`, {
      cache: "no-store",
      headers: {
        cookie: `sb-access-token=${accessToken}`,
      },
    });

    if (!response.ok) {
      return <ErrorState message="Could not load live exercise info payload." />;
    }

    const payload = (await response.json()) as ExerciseInfoApiSuccess;
    if (!payload?.ok || !payload.payload?.exercise) {
      return <ErrorState message="Live exercise info payload was incomplete." />;
    }

    return renderLiveExerciseScreen(payload.payload);
  }

  const userId = explicitUserId;
  if (!userId) {
    return <ErrorState message="Missing access token or user id." />;
  }
  const payload = await loadLiveExercisePreview(userId, exerciseId);
  if (!payload) {
    return <ErrorState message="Exercise not found for this user." />;
  }

  return renderLiveExerciseScreen(payload);
}
