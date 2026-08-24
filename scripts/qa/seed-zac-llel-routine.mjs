#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  envPath,
  ensureDirectoryForFile,
  getOptionalEnv,
  getRequiredEnv,
  runtimeRoot,
} from "./fitness-qa-config.mjs";
import {
  ZAC_LLEL_PREFIX,
  ZAC_LLEL_ROUTINE_NAME,
  ZAC_LLEL_TIMEZONE,
  buildZacLlelRoutineName,
  buildZacLlelSessionName,
  collectZacLlelExerciseDefinitions,
  createLlelId,
  getZacLlelRoutineDefinition,
  getZacLlelStartDate,
  mapLlelMeasurementType,
  summarizeZacLlelDefinition,
} from "./zac-llel-routine-data.mjs";
import { resolveCanonicalExercises } from "./fitness-catalog-resolver.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const SOURCE_USER_EMAIL_ENV = "SOURCE_USER_EMAIL";
const SUPABASE_URL_ENV = "SUPABASE_URL";
const SET_LLEL_ACTIVE_ENV = "SET_LLEL_ACTIVE";
const RESTORE_ACTIVE_ROUTINE_ENV = "RESTORE_ACTIVE_ROUTINE";
const ALLOW_ZAC_LLEL_SEED_ENV = "ALLOW_ZAC_LLEL_SEED";
const RESTORE_METADATA_PATH = path.join(runtimeRoot, "zac-llel-restore.json");

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set();
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      continue;
    }
    const body = entry.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      values.set(body.slice(0, equalsIndex), body.slice(equalsIndex + 1));
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(body, next);
      index += 1;
      continue;
    }
    flags.add(body);
  }
  return { flags, values };
}

function isTruthy(value) {
  return /^(1|true|yes|on)$/i.test(String(value ?? "").trim());
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function requiredEnvReport() {
  const supabaseUrl = getOptionalEnv(NEXT_PUBLIC_SUPABASE_URL_ENV) ?? getOptionalEnv(SUPABASE_URL_ENV);
  const missing = [SUPABASE_SERVICE_ROLE_KEY_ENV, SOURCE_USER_EMAIL_ENV].filter((name) => !getOptionalEnv(name));
  if (!supabaseUrl) {
    missing.push(`${NEXT_PUBLIC_SUPABASE_URL_ENV} or ${SUPABASE_URL_ENV}`);
  }
  return { missing, supabaseUrl };
}

function assertAllowedHumanSeed(command) {
  if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && !isTruthy(getOptionalEnv(ALLOW_ZAC_LLEL_SEED_ENV))) {
    throw new Error(`${command} refused in production-like env. Set ${ALLOW_ZAC_LLEL_SEED_ENV}=true only for the intended local LLEL run.`);
  }
}

export function createServiceClient() {
  const report = requiredEnvReport();
  if (report.missing.length > 0) {
    throw new Error(`Missing required env: ${report.missing.join(", ")}. Set them in ${envPath} or the current shell.`);
  }

  return createClient(report.supabaseUrl, getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    db: {
      schema: "fitness",
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function assertSuccess(error, message) {
  if (error) {
    throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
  }
}

async function listAllUsers(adminClient) {
  const users = [];
  let page = 1;
  let nextPage = 1;
  while (nextPage) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    assertSuccess(error, "Unable to list Supabase auth users");
    users.push(...(data?.users ?? []));
    nextPage = data?.nextPage ?? null;
    page = nextPage ?? 0;
  }
  return users;
}

export async function findUserByEmail(adminClient, email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const users = await listAllUsers(adminClient);
  return users.find((user) => String(user.email ?? "").trim().toLowerCase() === normalized) ?? null;
}

export async function resolveTargetUser(client) {
  const email = getRequiredEnv(SOURCE_USER_EMAIL_ENV).toLowerCase();
  const user = await findUserByEmail(client, email);
  if (!user) {
    throw new Error(`${SOURCE_USER_EMAIL_ENV} did not match an auth user: ${email}`);
  }
  return { email, userId: user.id };
}

async function loadProfile(client, userId) {
  const { data, error } = await client
    .from("profiles")
    .select("id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit, user_kind")
    .eq("id", userId)
    .maybeSingle();
  assertSuccess(error, "Unable to load Zac profile");
  if (!data) {
    throw new Error(`Profile row does not exist for ${SOURCE_USER_EMAIL_ENV}.`);
  }
  return data;
}

async function readRestoreMetadata() {
  try {
    const raw = await fs.readFile(RESTORE_METADATA_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeRestoreMetadata(metadata) {
  ensureDirectoryForFile(RESTORE_METADATA_PATH);
  await fs.writeFile(RESTORE_METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function getLlelRoutineRows(client, userId) {
  const { data, error } = await client
    .from("routines")
    .select("id, name")
    .eq("user_id", userId)
    .like("name", `${ZAC_LLEL_PREFIX}%`);
  assertSuccess(error, "Unable to load existing Zac LLEL routines");
  return data ?? [];
}

async function deleteLlelData(client, userId, { restoreActiveRoutine = false } = {}) {
  const profile = await loadProfile(client, userId);
  const restoreMetadata = await readRestoreMetadata();
  const routineRows = await getLlelRoutineRows(client, userId);
  const routineIds = routineRows.map((row) => row.id).filter(Boolean);
  const deleted = {
    routines: routineIds.length,
    sessions: 0,
    followUpJobs: 0,
    exerciseStats: 0,
    exercises: 0,
  };

  let sessionIds = [];
  let dayIds = [];
  let exerciseIds = [];
  let stalePrefixedExerciseIds = [];

  if (routineIds.length > 0) {
    const { data: sessions, error: sessionsError } = await client
      .from("sessions")
      .select("id")
      .eq("user_id", userId)
      .in("routine_id", routineIds);
    assertSuccess(sessionsError, "Unable to load Zac LLEL sessions for reset");
    sessionIds = (sessions ?? []).map((row) => row.id).filter(Boolean);
    deleted.sessions = sessionIds.length;

    const { data: days, error: daysError } = await client
      .from("routine_days")
      .select("id")
      .eq("user_id", userId)
      .in("routine_id", routineIds);
    assertSuccess(daysError, "Unable to load Zac LLEL routine days for reset");
    dayIds = (days ?? []).map((row) => row.id).filter(Boolean);

    const { data: routineExercises, error: routineExerciseError } = dayIds.length > 0
      ? await client.from("routine_day_exercises").select("exercise_id").eq("user_id", userId).in("routine_day_id", dayIds)
      : { data: [], error: null };
    assertSuccess(routineExerciseError, "Unable to load Zac LLEL exercise ids for reset");
    exerciseIds = [...new Set((routineExercises ?? []).map((row) => row.exercise_id).filter(Boolean))];
  }

  if (exerciseIds.length > 0) {
    const { data: staleExercises, error: staleExerciseError } = await client
      .from("exercises")
      .select("id, name, is_global, user_id")
      .eq("user_id", userId)
      .eq("is_global", false)
      .in("id", exerciseIds);
    assertSuccess(staleExerciseError, "Unable to classify stale Zac LLEL exercises for reset");
    stalePrefixedExerciseIds = (staleExercises ?? [])
      .filter((row) => String(row.name ?? "").startsWith(ZAC_LLEL_PREFIX))
      .map((row) => row.id)
      .filter(Boolean);
  }

  if (sessionIds.length > 0) {
    const { error, count } = await client
      .from("session_follow_up_jobs")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .in("session_id", sessionIds);
    assertSuccess(error, "Unable to delete Zac LLEL follow-up jobs");
    deleted.followUpJobs = count ?? 0;
  }

  if (stalePrefixedExerciseIds.length > 0) {
    const { error, count } = await client
      .from("exercise_stats")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .in("exercise_id", stalePrefixedExerciseIds);
    assertSuccess(error, "Unable to delete Zac LLEL exercise stats");
    deleted.exerciseStats = count ?? 0;
  }

  if (sessionIds.length > 0) {
    assertSuccess((await client.from("sessions").delete().eq("user_id", userId).in("id", sessionIds)).error, "Unable to delete Zac LLEL sessions");
  }
  if (routineIds.length > 0) {
    assertSuccess((await client.from("routines").delete().eq("user_id", userId).in("id", routineIds)).error, "Unable to delete Zac LLEL routines");
  }
  if (stalePrefixedExerciseIds.length > 0) {
    const { error, count } = await client
      .from("exercises")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("is_global", false)
      .in("id", stalePrefixedExerciseIds);
    assertSuccess(error, "Unable to delete Zac LLEL exercises by id");
    deleted.exercises += count ?? 0;
  }

  const { error: prefixedExerciseError, count: prefixedExerciseCount } = await client
    .from("exercises")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("is_global", false)
    .like("name", `${ZAC_LLEL_PREFIX}%`);
  assertSuccess(prefixedExerciseError, "Unable to delete prefixed Zac LLEL exercises");
  deleted.exercises += prefixedExerciseCount ?? 0;

  const activeWasLlel = Boolean(profile.active_routine_id && routineIds.includes(profile.active_routine_id));
  const restoredActiveRoutineId = restoreActiveRoutine
    ? restoreMetadata?.previousActiveRoutineId ?? null
    : (activeWasLlel ? null : profile.active_routine_id);

  if (restoreActiveRoutine || activeWasLlel) {
    assertSuccess(
      (await client.from("profiles").update({ active_routine_id: restoredActiveRoutineId }).eq("id", userId)).error,
      "Unable to restore Zac active routine after LLEL reset",
    );
  }

  return {
    deleted,
    previousActiveRoutineId: profile.active_routine_id ?? null,
    restoredActiveRoutineId,
    restoreMetadataPath: RESTORE_METADATA_PATH,
  };
}

function buildRoutineExerciseRow({ userId, dayId, exerciseId, position, definition }) {
  return {
    id: createLlelId(),
    user_id: userId,
    routine_day_id: dayId,
    exercise_id: exerciseId,
    position,
    target_sets: definition.targetSets,
    target_reps: definition.repsMax,
    target_reps_min: definition.repsMin,
    target_reps_max: definition.repsMax,
    target_weight: definition.targetWeight,
    target_weight_unit: definition.targetWeightUnit,
    target_duration_seconds: definition.targetDurationSeconds,
    target_distance: definition.targetDistance,
    target_distance_unit: definition.targetDistanceUnit,
    target_calories: definition.targetCalories,
    measurement_type: mapLlelMeasurementType(definition.measurementType),
    default_unit: definition.defaultUnit,
    notes: `${ZAC_LLEL_PREFIX} ${definition.key}`,
    progression_playbook_id: definition.playbookId,
    progression_playbook_config: definition.playbookConfig,
  };
}

function buildSessionExerciseRow({ userId, sessionId, exerciseId, routineExercise, position, definition }) {
  return {
    id: createLlelId(),
    user_id: userId,
    session_id: sessionId,
    exercise_id: exerciseId,
    routine_day_exercise_id: routineExercise.id,
    position,
    performed_index: position,
    notes: `${ZAC_LLEL_PREFIX} ${definition.key}`,
    is_skipped: false,
    measurement_type: mapLlelMeasurementType(definition.measurementType),
    default_unit: definition.defaultUnit,
    target_sets_min: definition.targetSets,
    target_sets_max: definition.targetSets,
    target_reps: definition.repsMax,
    target_reps_min: definition.repsMin,
    target_reps_max: definition.repsMax,
    target_weight: definition.targetWeight,
    target_weight_min: definition.targetWeight,
    target_weight_max: definition.targetWeight,
    target_weight_unit: definition.targetWeightUnit,
    target_duration_seconds: definition.targetDurationSeconds,
    target_time_seconds_min: definition.targetDurationSeconds,
    target_time_seconds_max: definition.targetDurationSeconds,
    target_distance: definition.targetDistance,
    target_distance_min: definition.targetDistance,
    target_distance_max: definition.targetDistance,
    target_distance_unit: definition.targetDistanceUnit,
    target_calories: definition.targetCalories,
    target_calories_min: definition.targetCalories,
    target_calories_max: definition.targetCalories,
  };
}

function buildSetRows({ userId, sessionExerciseId, sets }) {
  return sets.map((set, index) => ({
    id: createLlelId(),
    user_id: userId,
    session_exercise_id: sessionExerciseId,
    set_index: index + 1,
    weight: set.weight ?? 0,
    reps: set.reps ?? 0,
    weight_unit: set.weightUnit ?? null,
    duration_seconds: set.durationSeconds ?? null,
    distance: set.distance ?? null,
    distance_unit: set.distanceUnit ?? null,
    calories: set.calories ?? null,
    rpe: null,
    is_warmup: false,
    notes: ZAC_LLEL_PREFIX,
  }));
}

function appendRoutineDataset({ definition, userId, routine, rows, canonicalExerciseByName }) {
  rows.routines.push(routine);

  for (const [dayIndex, day] of definition.days.entries()) {
    const dayId = createLlelId();
    rows.days.push({
      id: dayId,
      user_id: userId,
      routine_id: routine.id,
      day_index: dayIndex + 1,
      name: day.name,
      is_rest: Boolean(day.isRest),
      notes: `${ZAC_LLEL_PREFIX} ${definition.id}`,
    });

    for (const [exerciseIndex, item] of (day.exercises ?? []).entries()) {
      const canonicalExercise = canonicalExerciseByName.get(item.name);
      if (!canonicalExercise?.id) {
        throw new Error(`Missing canonical exercise mapping for Zac LLEL seed: ${item.name}`);
      }
      const exerciseId = canonicalExercise.id;

      const routineExercise = buildRoutineExerciseRow({
        userId,
        dayId,
        exerciseId,
        position: exerciseIndex + 1,
        definition: item,
      });
      rows.routineExercises.push(routineExercise);

      for (const [sessionIndex, exposure] of (item.sessions ?? []).entries()) {
        const sessionId = createLlelId();
        const sessionExercise = buildSessionExerciseRow({
          userId,
          sessionId,
          exerciseId,
          routineExercise,
          position: exerciseIndex + 1,
          definition: item,
        });
        rows.sessions.push({
          id: sessionId,
          user_id: userId,
          routine_id: routine.id,
          routine_day_index: dayIndex + 1,
          name: buildZacLlelSessionName(day.name, item.name),
          routine_day_name: day.name,
          day_name_override: null,
          performed_at: exposure.performedAt,
          duration_seconds: 3600,
          status: exposure.status,
          notes: `${ZAC_LLEL_PREFIX} scenario=${definition.id}; exposure=${sessionIndex + 1}`,
        });
        rows.sessionExercises.push(sessionExercise);
        rows.sets.push(...buildSetRows({
          userId,
          sessionExerciseId: sessionExercise.id,
          sets: exposure.sets,
        }));
      }
    }
  }
}

function buildInsertRows(userId, canonicalExerciseByName) {
  const definition = getZacLlelRoutineDefinition();
  const rows = {
    routines: [],
    days: [],
    exercises: [],
    routineExercises: [],
    sessions: [],
    sessionExercises: [],
    sets: [],
  };
  const routineId = createLlelId();

  appendRoutineDataset({
    definition,
    userId,
    routine: {
      id: routineId,
      user_id: userId,
      name: buildZacLlelRoutineName(),
      cycle_length_days: definition.days.length,
      start_date: getZacLlelStartDate(),
      timezone: ZAC_LLEL_TIMEZONE,
      weight_unit: "lbs",
      default_progression_playbook_id: "double_progression",
      default_progression_playbook_config: { version: 1, loadIncrement: 5 },
    },
    rows,
    canonicalExerciseByName,
  });

  for (const [index, contextRoutine] of (definition.contextRoutines ?? []).entries()) {
    appendRoutineDataset({
      definition: {
        ...definition,
        id: `${definition.id}_context_${index + 1}`,
        days: contextRoutine.days,
      },
      userId,
      routine: {
        id: createLlelId(),
        user_id: userId,
        name: contextRoutine.name,
        cycle_length_days: Math.max(1, contextRoutine.days.length),
        start_date: "2026-04-01",
        timezone: ZAC_LLEL_TIMEZONE,
        weight_unit: "lbs",
        default_progression_playbook_id: "double_progression",
        default_progression_playbook_config: { version: 1, loadIncrement: 5 },
      },
      rows,
      canonicalExerciseByName,
    });
  }

  return { routineId, definition, rows };
}

async function seedZacLlelRoutine(client, userId, { setActive }) {
  const profile = await loadProfile(client, userId);
  const existingMetadata = await readRestoreMetadata();
  const canonicalResolution = await resolveCanonicalExercises(client, collectZacLlelExerciseDefinitions());
  const canonicalExerciseByName = new Map([...canonicalResolution.mapping.entries()]);
  const reset = await deleteLlelData(client, userId, { restoreActiveRoutine: false });
  const { routineId, definition, rows } = buildInsertRows(userId, canonicalExerciseByName);

  assertSuccess((await client.from("routines").insert(rows.routines)).error, "Unable to insert Zac LLEL routines");
  assertSuccess((await client.from("routine_days").insert(rows.days)).error, "Unable to insert Zac LLEL routine days");
  assertSuccess((await client.from("routine_day_exercises").insert(rows.routineExercises)).error, "Unable to insert Zac LLEL routine exercises");
  if (rows.sessions.length > 0) {
    assertSuccess((await client.from("sessions").insert(rows.sessions)).error, "Unable to insert Zac LLEL sessions");
  }
  if (rows.sessionExercises.length > 0) {
    assertSuccess((await client.from("session_exercises").insert(rows.sessionExercises)).error, "Unable to insert Zac LLEL session exercises");
  }
  if (rows.sets.length > 0) {
    assertSuccess((await client.from("sets").insert(rows.sets)).error, "Unable to insert Zac LLEL sets");
  }

  const previousActiveRoutineId = existingMetadata?.previousActiveRoutineId
    ?? (reset.previousActiveRoutineId && reset.previousActiveRoutineId !== routineId ? reset.previousActiveRoutineId : profile.active_routine_id ?? null);

  await writeRestoreMetadata({
    version: 1,
    createdAt: new Date().toISOString(),
    userId,
    routineId,
    routineName: ZAC_LLEL_ROUTINE_NAME,
    previousActiveRoutineId,
    setActive,
  });

  if (setActive) {
    assertSuccess(
      (await client.from("profiles").update({ active_routine_id: routineId }).eq("id", userId)).error,
      "Unable to activate Zac LLEL routine",
    );
  }

  return {
    routineId,
    previousActiveRoutineId,
    setActive,
    resetBeforeSeed: reset.deleted,
    summary: summarizeZacLlelDefinition(definition),
    inserted: {
      routines: rows.routines.length,
      days: rows.days.length,
      exercises: rows.exercises.length,
      routineExercises: rows.routineExercises.length,
      sessions: rows.sessions.length,
      sessionExercises: rows.sessionExercises.length,
      sets: rows.sets.length,
    },
    canonicalExercises: canonicalResolution.resolved,
  };
}

export function buildDryRunPayload(command = "seed", { canonicalExercises = [] } = {}) {
  const report = requiredEnvReport();
  const summary = summarizeZacLlelDefinition();
  return {
    command,
    dryRun: true,
    localEnvPath: envPath,
    requiredEnvMissing: report.missing,
    targetUserEmail: getOptionalEnv(SOURCE_USER_EMAIL_ENV),
    routineName: ZAC_LLEL_ROUTINE_NAME,
    setLlelActive: isTruthy(getOptionalEnv(SET_LLEL_ACTIVE_ENV)),
    restoreActiveRoutine: isTruthy(getOptionalEnv(RESTORE_ACTIVE_ROUTINE_ENV)),
    restoreMetadataPath: RESTORE_METADATA_PATH,
    summary,
    canonicalExercises,
    exerciseInsertCount: 0,
    plan: command === "reset"
      ? "Delete only SOURCE_USER_EMAIL-owned [ZAC-LLEL] routines, sessions, follow-ups, stale prefixed exercise stats, and stale prefixed custom exercises; optionally restore previous active routine."
      : "Reset existing [ZAC-LLEL] rows for SOURCE_USER_EMAIL, resolve canonical global exercises, seed Atlas Progression Lab, and optionally set it active.",
    safety: [
      "Requires SOURCE_USER_EMAIL; no email is hardcoded.",
      "Only rows owned by SOURCE_USER_EMAIL are touched.",
      "Routine/session data is scoped by the [ZAC-LLEL] prefix.",
      "Zac LLEL inserts zero exercises and uses canonical global exercise IDs only.",
      "Auth users and non-prefixed Atlas data are never deleted.",
      "Previous active routine is captured in runtime/fitness/zac-llel-restore.json.",
    ],
  };
}

export async function runZacLlelSeed({ dryRun = false } = {}) {
  assertAllowedHumanSeed("Zac LLEL seed");
  if (dryRun) {
    const report = requiredEnvReport();
    if (report.missing.length > 0) {
      return buildDryRunPayload("seed");
    }

    const client = createServiceClient();
    const canonicalResolution = await resolveCanonicalExercises(client, collectZacLlelExerciseDefinitions());
    return buildDryRunPayload("seed", { canonicalExercises: canonicalResolution.resolved });
  }

  const client = createServiceClient();
  const target = await resolveTargetUser(client);
  const seeded = await seedZacLlelRoutine(client, target.userId, {
    setActive: isTruthy(getOptionalEnv(SET_LLEL_ACTIVE_ENV)),
  });

  return {
    command: "seed",
    dryRun: false,
    email: target.email,
    userId: target.userId,
    ...seeded,
    routes: {
      today: "/today",
      routines: "/routines",
      history: "/history",
      audit: "/dev/progression-audit",
      scenarios: "/dev/progression-scenarios",
    },
    reset: "npm run qa:zac:llel:reset",
  };
}

export async function runZacLlelReset({ dryRun = false } = {}) {
  assertAllowedHumanSeed("Zac LLEL reset");
  if (dryRun) {
    return buildDryRunPayload("reset");
  }

  const client = createServiceClient();
  const target = await resolveTargetUser(client);
  const restoreEnv = getOptionalEnv(RESTORE_ACTIVE_ROUTINE_ENV);
  const reset = await deleteLlelData(client, target.userId, {
    restoreActiveRoutine: restoreEnv === null ? true : isTruthy(restoreEnv),
  });

  return {
    command: "reset",
    dryRun: false,
    email: target.email,
    userId: target.userId,
    ...reset,
  };
}

async function main() {
  const parsed = parseArgs();
  const dryRun = parsed.flags.has("dry-run");
  const result = await runZacLlelSeed({ dryRun });
  printJson(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  });
}
