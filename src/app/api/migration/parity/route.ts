import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  FITNESS_LEGACY_EXCLUDED_TABLES,
  FITNESS_LEGACY_SIGNOFF_METRICS,
  FITNESS_LEGACY_SIGNOFF_NOTES,
  FITNESS_LEGACY_SNAPSHOT_VERSION,
  getFitnessLegacySnapshotSignoffCounts,
  type FitnessLegacySignoffCountMap,
  type FitnessLegacySnapshot,
} from "@/lib/migration/fitness-legacy-contract";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type MigrationParityRequest = {
  snapshot?: FitnessLegacySnapshot;
};

function isFitnessLegacySnapshot(value: unknown): value is FitnessLegacySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FitnessLegacySnapshot>;
  return snapshot.metadata?.snapshot_version === FITNESS_LEGACY_SNAPSHOT_VERSION;
}

async function getExactCount(table: string, column: string, userId: string) {
  const { count, error } = await supabaseAdmin()
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, userId);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function getDatabaseSignoffCounts(
  userId: string,
): Promise<FitnessLegacySignoffCountMap> {
  const [
    profiles,
    userOwnedExercises,
    routines,
    routineDays,
    routineDayExercises,
    sessions,
    sessionExercises,
    sets,
  ] = await Promise.all([
    getExactCount("profiles", "id", userId),
    getExactCount("exercises", "user_id", userId),
    getExactCount("routines", "user_id", userId),
    getExactCount("routine_days", "user_id", userId),
    getExactCount("routine_day_exercises", "user_id", userId),
    getExactCount("sessions", "user_id", userId),
    getExactCount("session_exercises", "user_id", userId),
    getExactCount("sets", "user_id", userId),
  ]);

  return {
    profiles,
    user_owned_exercises: userOwnedExercises,
    routines,
    routine_days: routineDays,
    routine_day_exercises: routineDayExercises,
    sessions,
    session_exercises: sessionExercises,
    sets,
  };
}

export async function POST(request: Request) {
  let payload: MigrationParityRequest;

  try {
    payload = (await request.json()) as MigrationParityRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  if (!isFitnessLegacySnapshot(payload.snapshot)) {
    return NextResponse.json(
      { ok: false, error: "Expected a fitness-legacy-v1 snapshot payload." },
      { status: 400 },
    );
  }

  const user = await requireUser();
  const snapshotCounts = getFitnessLegacySnapshotSignoffCounts(payload.snapshot);
  const databaseCounts = await getDatabaseSignoffCounts(user.id);
  const counts = FITNESS_LEGACY_SIGNOFF_METRICS.map((metric) => ({
    metric,
    snapshot: snapshotCounts[metric],
    database: databaseCounts[metric],
    matches: snapshotCounts[metric] === databaseCounts[metric],
  }));

  return NextResponse.json({
    ok: true,
    data: {
      comparedAt: new Date().toISOString(),
      userId: user.id,
      excludedTables: FITNESS_LEGACY_EXCLUDED_TABLES,
      notes: FITNESS_LEGACY_SIGNOFF_NOTES,
      counts,
    },
  });
}
