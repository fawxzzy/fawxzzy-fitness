#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolveCanonicalExercises } from "./fitness-catalog-resolver.mjs";
import {
  ZAC_LLEL_PREFIX,
} from "./zac-llel-routine-data.mjs";
import {
  assertSuccess,
  createServiceClient,
  resolveTargetUser,
} from "./seed-zac-llel-routine.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const STALE_ZAC_LLEL_CANONICAL_NAME_ALIASES = new Map([
  ["Distance Run", "Treadmill Run"],
  ["Standing Calf Raise", "Calf Raise (Standing)"],
  ["Mobility", "Stretch"],
]);

function parseArgs(argv = process.argv.slice(2)) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function stripZacPrefix(name) {
  const value = String(name ?? "").trim();
  return value.startsWith(ZAC_LLEL_PREFIX) ? value.slice(ZAC_LLEL_PREFIX.length).trim() : value;
}

function resolveStaleCanonicalName(name) {
  const stripped = stripZacPrefix(name);
  return STALE_ZAC_LLEL_CANONICAL_NAME_ALIASES.get(stripped) ?? stripped;
}

async function loadPrefixedExercises(client, userId) {
  const { data, error } = await client
    .from("exercises")
    .select("id, name, is_global, user_id")
    .eq("user_id", userId)
    .eq("is_global", false)
    .like("name", `${ZAC_LLEL_PREFIX}%`);
  assertSuccess(error, "Unable to load stale Zac LLEL exercises");
  return data ?? [];
}

async function loadZacLlelRoutineIds(client, userId) {
  const { data, error } = await client
    .from("routines")
    .select("id, name")
    .eq("user_id", userId)
    .like("name", `${ZAC_LLEL_PREFIX}%`);
  assertSuccess(error, "Unable to load Zac LLEL routines for repair");
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function loadZacLlelSessionIds(client, userId, routineIds) {
  if (routineIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .in("routine_id", routineIds);
  assertSuccess(error, "Unable to load Zac LLEL sessions for repair");
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function loadZacLlelRoutineDayIds(client, userId, routineIds) {
  if (routineIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("routine_days")
    .select("id")
    .eq("user_id", userId)
    .in("routine_id", routineIds);
  assertSuccess(error, "Unable to load Zac LLEL routine days for repair");
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function countReferences(client, userId, table, column, ids, scope) {
  if (ids.length === 0 || (scope?.column && scope.values.length === 0)) {
    return 0;
  }

  let query = client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in(column, ids);

  if (scope?.column && scope.values.length > 0) {
    query = query.in(scope.column, scope.values);
  }

  const { count, error } = await query;
  assertSuccess(error, `Unable to count ${table} references for Zac LLEL repair`);
  return count ?? 0;
}

async function updateReferences(client, userId, table, column, staleId, canonicalId, scope) {
  if (scope?.column && scope.values.length === 0) {
    return;
  }

  let query = client
    .from(table)
    .update({ exercise_id: canonicalId })
    .eq("user_id", userId)
    .eq("exercise_id", staleId);

  if (scope?.column && scope.values.length > 0) {
    query = query.in(scope.column, scope.values);
  }

  assertSuccess((await query).error, `Unable to remap ${table}.${column} from stale Zac LLEL exercise`);
}

export async function runZacLlelCatalogRepair({ dryRun = false } = {}) {
  const client = createServiceClient();
  const target = await resolveTargetUser(client);
  const staleExercises = await loadPrefixedExercises(client, target.userId);
  const strippedDefinitions = staleExercises.map((exercise) => ({
    name: stripZacPrefix(exercise.name),
    canonicalName: resolveStaleCanonicalName(exercise.name),
  }));
  const canonicalResolution = strippedDefinitions.length > 0
    ? await resolveCanonicalExercises(client, strippedDefinitions)
    : { mapping: new Map(), resolved: [] };
  const canonicalByName = new Map(canonicalResolution.resolved.map((entry) => [entry.canonicalName, {
    id: entry.exerciseId,
    name: entry.canonicalName,
  }]));
  const routineIds = await loadZacLlelRoutineIds(client, target.userId);
  const routineDayIds = await loadZacLlelRoutineDayIds(client, target.userId, routineIds);
  const sessionIds = await loadZacLlelSessionIds(client, target.userId, routineIds);
  const repairPlan = [];

  for (const staleExercise of staleExercises) {
    const strippedName = stripZacPrefix(staleExercise.name);
    const canonicalName = resolveStaleCanonicalName(staleExercise.name);
    const canonicalExercise = canonicalResolution.mapping.get(strippedName) ?? canonicalByName.get(canonicalName);
    if (!canonicalExercise?.id) {
      throw new Error(`Could not resolve stale Zac LLEL exercise to canonical catalog row: ${staleExercise.name}`);
    }

    const routineReferenceCount = await countReferences(
      client,
      target.userId,
      "routine_day_exercises",
      "exercise_id",
      [staleExercise.id],
      { column: "routine_day_id", values: routineDayIds },
    );
    const sessionReferenceCount = await countReferences(
      client,
      target.userId,
      "session_exercises",
      "exercise_id",
      [staleExercise.id],
      { column: "session_id", values: sessionIds },
    );

    repairPlan.push({
      staleExerciseId: staleExercise.id,
      staleName: staleExercise.name,
      canonicalExerciseId: canonicalExercise.id,
      canonicalName: canonicalExercise.name,
      aliasApplied: canonicalName !== strippedName,
      routineReferenceCount,
      sessionReferenceCount,
    });
  }

  if (!dryRun) {
    for (const entry of repairPlan) {
      await updateReferences(
        client,
        target.userId,
        "routine_day_exercises",
        "exercise_id",
        entry.staleExerciseId,
        entry.canonicalExerciseId,
        { column: "routine_day_id", values: routineDayIds },
      );
      await updateReferences(
        client,
        target.userId,
        "session_exercises",
        "exercise_id",
        entry.staleExerciseId,
        entry.canonicalExerciseId,
        { column: "session_id", values: sessionIds },
      );
    }

    const staleIds = repairPlan.map((entry) => entry.staleExerciseId);
    if (staleIds.length > 0) {
      assertSuccess(
        (await client.from("exercise_stats").delete().eq("user_id", target.userId).in("exercise_id", staleIds)).error,
        "Unable to delete stale Zac LLEL exercise stats",
      );
      assertSuccess(
        (await client.from("exercises").delete().eq("user_id", target.userId).eq("is_global", false).in("id", staleIds)).error,
        "Unable to delete stale Zac LLEL exercises",
      );
    }
  }

  return {
    command: "repair-catalog",
    dryRun,
    email: target.email,
    userId: target.userId,
    staleExerciseCount: staleExercises.length,
    routineIds,
    canonicalExercises: canonicalResolution.resolved,
    repairPlan,
    policy: [
      "Only SOURCE_USER_EMAIL-owned [ZAC-LLEL] routine/session references are remapped.",
      "Only stale user-owned [ZAC-LLEL] exercises are deleted.",
      "Canonical global exercises are never deleted.",
    ],
  };
}

async function main() {
  const { dryRun } = parseArgs();
  printJson(await runZacLlelCatalogRepair({ dryRun }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
