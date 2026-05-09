#!/usr/bin/env node
import process from "node:process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  ALL_WRITABLE_SCENARIO_IDS,
  FULL_ROUTINE_QA_PREFIX,
  FULL_ROUTINE_SCENARIO_IDS,
  PROGRESSION_QA_PREFIX,
  assertWritableProgressionScenarioId,
  getWritableProgressionScenarioDefinition,
  getWritableProgressionScenarioDefinitions,
  listWritableProgressionScenarioSummaries,
} from "./fitness-progression-scenario-definitions.mjs";
import {
  envPath,
  getOptionalEnv,
  getRequiredEnv,
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
} from "./fitness-qa-config.mjs";

const FITNESS_CODEX_QA_EMAIL_ENV = "FITNESS_CODEX_QA_EMAIL";
const FITNESS_CODEX_QA_PASSWORD_ENV = "FITNESS_CODEX_QA_PASSWORD";
const SOURCE_USER_EMAIL_ENV = "SOURCE_USER_EMAIL";
const SOURCE_ROUTINE_ID_ENV = "SOURCE_ROUTINE_ID";
const SUPABASE_URL_ENV = "SUPABASE_URL";

const CLONE_PREFIX = "[Codex QA]";
const USER_OWNED_TABLES = [
  "session_follow_up_jobs",
  "exercise_stats",
  "sets",
  "session_exercises",
  "sessions",
  "routine_day_exercises",
  "routine_days",
  "routines",
  "exercises",
];

const SCENARIO_COMMAND_PREFIX = `${PROGRESSION_QA_PREFIX} `;

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

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function requiredEnvReport() {
  const supabaseUrl = getOptionalEnv(NEXT_PUBLIC_SUPABASE_URL_ENV) ?? getOptionalEnv(SUPABASE_URL_ENV);
  const required = [
    SUPABASE_SERVICE_ROLE_KEY_ENV,
    FITNESS_CODEX_QA_EMAIL_ENV,
    FITNESS_CODEX_QA_PASSWORD_ENV,
  ];
  const missing = required.filter((name) => !getOptionalEnv(name));
  if (!supabaseUrl) {
    missing.push(`${NEXT_PUBLIC_SUPABASE_URL_ENV} or ${SUPABASE_URL_ENV}`);
  }

  return { missing, supabaseUrl };
}

function createServiceClient() {
  const report = requiredEnvReport();
  if (report.missing.length > 0) {
    throw new Error(`Missing required env: ${report.missing.join(", ")}. Set them in ${envPath} or the current shell.`);
  }

  return createClient(
    report.supabaseUrl,
    getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function assertSuccess(error, message) {
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

async function findUserByEmail(adminClient, email) {
  const normalized = email.trim().toLowerCase();
  const users = await listAllUsers(adminClient);
  return users.find((user) => String(user.email ?? "").trim().toLowerCase() === normalized) ?? null;
}

async function ensureCodexQaUser(client) {
  const email = getRequiredEnv(FITNESS_CODEX_QA_EMAIL_ENV).toLowerCase();
  const password = getRequiredEnv(FITNESS_CODEX_QA_PASSWORD_ENV);
  const existingUser = await findUserByEmail(client, email);
  const attributes = {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_kind: "automation",
      owner: "codex",
      purpose: "fitness_qa",
      display_name: "Codex Fitness QA",
    },
    app_metadata: {
      account_kind: "automation",
      owner: "codex",
      purpose: "fitness_qa",
    },
  };

  if (!existingUser) {
    const { data, error } = await client.auth.admin.createUser(attributes);
    assertSuccess(error, "Unable to create Codex Fitness QA auth user");
    return { user: data.user, created: true };
  }

  const { data, error } = await client.auth.admin.updateUserById(existingUser.id, attributes);
  assertSuccess(error, "Unable to update Codex Fitness QA auth user");
  return { user: data.user, created: false };
}

async function ensureCodexProfile(client, userId) {
  const profile = {
    id: userId,
    timezone: "America/New_York",
    active_routine_id: null,
    preferred_weight_unit: "lbs",
    preferred_distance_unit: "mi",
    user_kind: "automation",
    user_number: null,
    user_number_assigned_at: null,
  };
  const { error } = await client.from("profiles").upsert(profile, { onConflict: "id" });
  assertSuccess(error, "Unable to upsert Codex QA profile");
}

async function resolveSourceUserId(client) {
  const sourceUserEmail = getOptionalEnv(SOURCE_USER_EMAIL_ENV);
  if (!sourceUserEmail) {
    return null;
  }

  const sourceUser = await findUserByEmail(client, sourceUserEmail);
  if (!sourceUser) {
    throw new Error(`SOURCE_USER_EMAIL did not match an auth user: ${sourceUserEmail}`);
  }

  return sourceUser.id;
}

async function resolveSourceRoutine(client) {
  const sourceRoutineId = getOptionalEnv(SOURCE_ROUTINE_ID_ENV);
  const sourceUserId = await resolveSourceUserId(client);

  if (sourceRoutineId) {
    let query = client.from("routines").select("*").eq("id", sourceRoutineId).single();
    if (sourceUserId) {
      query = query.eq("user_id", sourceUserId);
    }
    const { data, error } = await query;
    assertSuccess(error, "Unable to load SOURCE_ROUTINE_ID");
    return data;
  }

  if (!sourceUserId) {
    throw new Error(`Set ${SOURCE_ROUTINE_ID_ENV} or ${SOURCE_USER_EMAIL_ENV} to choose the routine to clone.`);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("active_routine_id")
    .eq("id", sourceUserId)
    .maybeSingle();
  assertSuccess(profileError, "Unable to load source profile");

  if (profile?.active_routine_id) {
    const { data, error } = await client
      .from("routines")
      .select("*")
      .eq("id", profile.active_routine_id)
      .eq("user_id", sourceUserId)
      .single();
    assertSuccess(error, "Unable to load active routine for source user");
    return data;
  }

  const { data, error } = await client
    .from("routines")
    .select("*")
    .eq("user_id", sourceUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  assertSuccess(error, "Unable to load latest routine for source user");
  return data;
}

function stripRoutineForClone(row, userId, routineId) {
  return {
    ...row,
    id: routineId,
    user_id: userId,
    name: `${CLONE_PREFIX} ${row.name ?? "Routine"}`,
  };
}

function stripDayForClone(row, userId, routineId, dayId) {
  return {
    ...row,
    id: dayId,
    user_id: userId,
    routine_id: routineId,
  };
}

function stripExerciseForClone(row, userId, dayId, exerciseId) {
  return {
    ...row,
    id: exerciseId,
    user_id: userId,
    routine_day_id: dayId,
  };
}

async function cloneRoutine(client, codexUserId, sourceRoutine) {
  const clonedRoutineId = randomUUID();
  const { data: days, error: daysError } = await client
    .from("routine_days")
    .select("*")
    .eq("routine_id", sourceRoutine.id)
    .order("day_index", { ascending: true });
  assertSuccess(daysError, "Unable to load source routine days");

  const sourceDayIds = (days ?? []).map((day) => day.id);
  const { data: exercises, error: exercisesError } = sourceDayIds.length > 0
    ? await client
      .from("routine_day_exercises")
      .select("*")
      .in("routine_day_id", sourceDayIds)
      .order("position", { ascending: true })
    : { data: [], error: null };
  assertSuccess(exercisesError, "Unable to load source routine exercises");

  const dayIdMap = new Map(sourceDayIds.map((dayId) => [dayId, randomUUID()]));
  const routineClone = stripRoutineForClone(sourceRoutine, codexUserId, clonedRoutineId);
  const dayClones = (days ?? []).map((day) => stripDayForClone(day, codexUserId, clonedRoutineId, dayIdMap.get(day.id)));
  const exerciseClones = (exercises ?? []).map((exercise) => stripExerciseForClone(
    exercise,
    codexUserId,
    dayIdMap.get(exercise.routine_day_id),
    randomUUID(),
  ));

  assertSuccess((await client.from("routines").insert(routineClone)).error, "Unable to insert cloned routine");
  if (dayClones.length > 0) {
    assertSuccess((await client.from("routine_days").insert(dayClones)).error, "Unable to insert cloned routine days");
  }
  if (exerciseClones.length > 0) {
    assertSuccess((await client.from("routine_day_exercises").insert(exerciseClones)).error, "Unable to insert cloned routine exercises");
  }
  assertSuccess(
    (await client.from("profiles").update({ active_routine_id: clonedRoutineId }).eq("id", codexUserId)).error,
    "Unable to activate cloned routine for Codex QA profile",
  );

  return {
    sourceRoutineId: sourceRoutine.id,
    clonedRoutineId,
    dayCount: dayClones.length,
    exerciseCount: exerciseClones.length,
  };
}

async function resetCodexQaData(client, codexUserId) {
  for (const table of USER_OWNED_TABLES) {
    const { error } = await client.from(table).delete().eq("user_id", codexUserId);
    assertSuccess(error, `Unable to reset ${table} for Codex QA user`);
  }

  const { error } = await client
    .from("profiles")
    .update({
      active_routine_id: null,
      user_kind: "automation",
      user_number: null,
      user_number_assigned_at: null,
    })
    .eq("id", codexUserId);
  assertSuccess(error, "Unable to reset Codex QA profile");
}

function dryRunPayload(command, args) {
  const envReport = requiredEnvReport();
  return {
    command,
    dryRun: true,
    localEnvPath: envPath,
    requiredEnvMissing: envReport.missing,
    sourceRoutineSelection: {
      sourceRoutineId: getOptionalEnv(SOURCE_ROUTINE_ID_ENV),
      sourceUserEmail: getOptionalEnv(SOURCE_USER_EMAIL_ENV),
    },
    codexQaEmail: getOptionalEnv(FITNESS_CODEX_QA_EMAIL_ENV),
    plan: args.plan,
    scenarioFlags: args.scenarioFlags,
    progressionScenarioSelection: args.progressionScenarioSelection ?? null,
    writableProgressionScenarios: listWritableProgressionScenarioSummaries(),
    safety: [
      "Codex QA profile is marked user_kind=automation.",
      "Codex QA profile user_number stays null.",
      "Source routine is read only.",
      "Reset deletes rows only where user_id belongs to Codex QA; auth user is preserved.",
      "Progression scenario reset deletes only Codex QA rows with the [QA-PROGRESSION] or [QA-FULL-ROUTINE] prefix.",
    ],
  };
}

function getScenarioSelection(parsed) {
  const explicitScenario = parsed.values.get("scenario") ?? null;
  const allScenarios = parsed.flags.has("all-progression-scenarios");
  const allFullRoutineScenarios = parsed.flags.has("all-full-routine-scenarios");
  const selectorCount = [Boolean(explicitScenario), allScenarios, allFullRoutineScenarios].filter(Boolean).length;
  if (selectorCount > 1) {
    throw new Error("Use only one of --scenario <id>, --all-progression-scenarios, or --all-full-routine-scenarios.");
  }

  if (explicitScenario) {
    if (explicitScenario === "all") {
      return [...ALL_WRITABLE_SCENARIO_IDS];
    }
    if (explicitScenario === "full") {
      return [...FULL_ROUTINE_SCENARIO_IDS];
    }
    assertWritableProgressionScenarioId(explicitScenario);
    return [explicitScenario];
  }

  if (allScenarios) {
    return [...ALL_WRITABLE_SCENARIO_IDS];
  }

  if (allFullRoutineScenarios) {
    return [...FULL_ROUTINE_SCENARIO_IDS];
  }

  return [];
}

function getScenarioPrefix(scenarioId) {
  const scenario = getWritableProgressionScenarioDefinition(scenarioId);
  return scenario?.prefix ?? PROGRESSION_QA_PREFIX;
}

function buildScenarioRoutineName(scenarioId) {
  return `${getScenarioPrefix(scenarioId)} ${scenarioId}`;
}

function buildScenarioSessionName(scenarioId, dayName, exerciseName) {
  return `${getScenarioPrefix(scenarioId)} ${scenarioId} - ${dayName} - ${exerciseName}`;
  return `${SCENARIO_COMMAND_PREFIX}${scenarioId} · ${dayName} · ${exerciseName}`;
}

function buildScenarioExerciseName(scenarioId, exercise) {
  if (exercise.name === "Stretch") {
    return "Stretch";
  }
  return `${getScenarioPrefix(scenarioId)} ${scenarioId} - ${exercise.name}`;

  return `${SCENARIO_COMMAND_PREFIX}${scenarioId} · ${exercise.name}`;
}

function mapMeasurementType(value) {
  return value === "time" || value === "distance" || value === "time_distance" || value === "none" ? value : "reps";
}

function buildRoutineExerciseRow({ userId, dayId, exerciseId, position, exercise }) {
  return {
    id: randomUUID(),
    user_id: userId,
    routine_day_id: dayId,
    exercise_id: exerciseId,
    position,
    target_sets: exercise.targetSets,
    target_reps: exercise.repsMax,
    target_reps_min: exercise.repsMin,
    target_reps_max: exercise.repsMax,
    target_weight: exercise.targetWeight,
    target_weight_unit: exercise.targetWeightUnit,
    target_duration_seconds: exercise.targetDurationSeconds,
    target_distance: exercise.targetDistance,
    target_distance_unit: exercise.targetDistanceUnit,
    target_calories: exercise.targetCalories,
    measurement_type: mapMeasurementType(exercise.measurementType),
    default_unit: exercise.defaultUnit,
    notes: `${PROGRESSION_QA_PREFIX} ${exercise.key}`,
    progression_playbook_id: exercise.playbookId,
    progression_playbook_config: exercise.playbookConfig,
  };
}

function buildSessionExerciseRow({ userId, sessionId, exerciseId, routineExercise, position, exercise }) {
  return {
    id: randomUUID(),
    user_id: userId,
    session_id: sessionId,
    exercise_id: exerciseId,
    routine_day_exercise_id: routineExercise.id,
    position,
    performed_index: position,
    notes: `${PROGRESSION_QA_PREFIX} ${exercise.key}`,
    is_skipped: false,
    measurement_type: mapMeasurementType(exercise.measurementType),
    default_unit: exercise.defaultUnit,
    target_sets_min: exercise.targetSets,
    target_sets_max: exercise.targetSets,
    target_reps: exercise.repsMax,
    target_reps_min: exercise.repsMin,
    target_reps_max: exercise.repsMax,
    target_weight: exercise.targetWeight,
    target_weight_min: exercise.targetWeight,
    target_weight_max: exercise.targetWeight,
    target_weight_unit: exercise.targetWeightUnit,
    target_duration_seconds: exercise.targetDurationSeconds,
    target_time_seconds_min: exercise.targetDurationSeconds,
    target_time_seconds_max: exercise.targetDurationSeconds,
    target_distance: exercise.targetDistance,
    target_distance_min: exercise.targetDistance,
    target_distance_max: exercise.targetDistance,
    target_distance_unit: exercise.targetDistanceUnit,
    target_calories: exercise.targetCalories,
    target_calories_min: exercise.targetCalories,
    target_calories_max: exercise.targetCalories,
  };
}

function buildSetRows({ userId, sessionExerciseId, sets }) {
  return sets.map((set, index) => ({
    id: randomUUID(),
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
    notes: PROGRESSION_QA_PREFIX,
  }));
}

async function getScenarioRoutineIds(client, userId, scenarioIds) {
  const exactNames = Array.from(new Set(scenarioIds.flatMap((scenarioId) => [
    buildScenarioRoutineName(scenarioId),
    `${PROGRESSION_QA_PREFIX} ${scenarioId}`,
  ])));
  let query = client
    .from("routines")
    .select("id, name")
    .eq("user_id", userId);

  if (scenarioIds.length > 0) {
    query = query.or([
      exactNames.map((name) => `name.eq.${name}`).join(","),
      exactNames.map((name) => `name.like.${name} - context%`).join(","),
    ].filter(Boolean).join(","));
  } else {
    query = query.or(`name.like.${PROGRESSION_QA_PREFIX} %,name.like.${FULL_ROUTINE_QA_PREFIX} %`);
  }

  const { data, error } = await query;
  assertSuccess(error, "Unable to load Codex progression QA routines");
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

function getScenarioExerciseNameFilters(scenarioIds = []) {
  if (scenarioIds.length === 0) {
    return [
      `name.like.${PROGRESSION_QA_PREFIX} %`,
      `name.like.${FULL_ROUTINE_QA_PREFIX} %`,
    ];
  }

  return scenarioIds.flatMap((scenarioId) => Array.from(new Set([
    `name.like.${getScenarioPrefix(scenarioId)} ${scenarioId} - %`,
    `name.like.${PROGRESSION_QA_PREFIX} ${scenarioId} - %`,
  ])));
}

async function deletePrefixedScenarioExercises(client, userId, scenarioIds = [], knownExerciseIds = []) {
  const filters = getScenarioExerciseNameFilters(scenarioIds);
  let query = client
    .from("exercises")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("is_global", false);

  if (knownExerciseIds.length > 0) {
    query = query.or([
      `id.in.(${knownExerciseIds.join(",")})`,
      ...filters,
    ].join(","));
  } else {
    query = query.or(filters.join(","));
  }

  const { error, count } = await query;
  assertSuccess(error, "Unable to delete prefixed progression QA exercises");
  return count ?? 0;
}

async function resetWritableProgressionScenarios(client, userId, scenarioIds = []) {
  const routineIds = await getScenarioRoutineIds(client, userId, scenarioIds);
  const deleted = {
    routines: routineIds.length,
    sessions: 0,
    exercises: 0,
    followUpJobs: 0,
    exerciseStats: 0,
  };

  if (routineIds.length === 0) {
    deleted.exercises = await deletePrefixedScenarioExercises(client, userId, scenarioIds);
    return deleted;
  }

  const { data: sessionRows, error: sessionsError } = await client
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .in("routine_id", routineIds);
  assertSuccess(sessionsError, "Unable to load progression QA sessions for reset");
  const sessionIds = (sessionRows ?? []).map((row) => row.id).filter(Boolean);
  deleted.sessions = sessionIds.length;

  const { data: dayRows, error: dayError } = await client
    .from("routine_days")
    .select("id")
    .eq("user_id", userId)
    .in("routine_id", routineIds);
  assertSuccess(dayError, "Unable to load progression QA routine days for reset");
  const dayIds = (dayRows ?? []).map((row) => row.id).filter(Boolean);

  const { data: exerciseRows, error: routineExerciseError } = dayIds.length > 0
    ? await client
      .from("routine_day_exercises")
      .select("exercise_id")
      .eq("user_id", userId)
      .in("routine_day_id", dayIds)
    : { data: [], error: null };
  assertSuccess(routineExerciseError, "Unable to load progression QA exercise ids for reset");
  const exerciseIds = [...new Set((exerciseRows ?? []).map((row) => row.exercise_id).filter(Boolean))];

  if (sessionIds.length > 0) {
    const { error: jobError, count: jobCount } = await client
      .from("session_follow_up_jobs")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .in("session_id", sessionIds);
    assertSuccess(jobError, "Unable to delete progression QA follow-up jobs");
    deleted.followUpJobs = jobCount ?? 0;
  }

  if (exerciseIds.length > 0) {
    const { error: statsError, count: statsCount } = await client
      .from("exercise_stats")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds);
    assertSuccess(statsError, "Unable to delete progression QA exercise stats");
    deleted.exerciseStats = statsCount ?? 0;
  }

  if (sessionIds.length > 0) {
    assertSuccess(
      (await client.from("sessions").delete().eq("user_id", userId).in("id", sessionIds)).error,
      "Unable to delete progression QA sessions",
    );
  }

  assertSuccess(
    (await client.from("routines").delete().eq("user_id", userId).in("id", routineIds)).error,
    "Unable to delete progression QA routines",
  );

  if (exerciseIds.length > 0) {
    deleted.exercises = await deletePrefixedScenarioExercises(client, userId, scenarioIds, exerciseIds);
  } else {
    deleted.exercises = await deletePrefixedScenarioExercises(client, userId, scenarioIds);
  }

  const { error: profileError } = await client
    .from("profiles")
    .update({
      active_routine_id: null,
      user_kind: "automation",
      user_number: null,
      user_number_assigned_at: null,
    })
    .eq("id", userId)
    .in("active_routine_id", routineIds);
  assertSuccess(profileError, "Unable to clear deleted progression QA active routine");

  return deleted;
}

async function seedWritableProgressionScenario(client, userId, scenario) {
  const routineId = randomUUID();
  const routineName = buildScenarioRoutineName(scenario.id);
  const routine = {
    id: routineId,
    user_id: userId,
    name: routineName,
    cycle_length_days: Math.max(1, scenario.days.length),
    start_date: "2026-05-04",
    timezone: "America/New_York",
    weight_unit: "lbs",
    default_progression_playbook_id: "double_progression",
    default_progression_playbook_config: { version: 1, loadIncrement: 5 },
  };

  assertSuccess((await client.from("routines").insert(routine)).error, `Unable to insert progression QA routine ${scenario.id}`);

  const exerciseIdBySharedKey = new Map();
  const exerciseRows = [];
  const contextRoutineRows = [];
  const dayRows = [];
  const routineExerciseRows = [];
  const sessionRows = [];
  const sessionExerciseRows = [];
  const setRows = [];

  for (const [dayIndex, day] of scenario.days.entries()) {
    const dayId = randomUUID();
    dayRows.push({
      id: dayId,
      user_id: userId,
      routine_id: routineId,
      day_index: dayIndex + 1,
      name: day.name,
      is_rest: false,
      notes: `${PROGRESSION_QA_PREFIX} ${scenario.id}`,
    });

    for (const [exerciseIndex, definition] of day.exercises.entries()) {
      const sharedKey = definition.sharedExerciseKey ?? `${scenario.id}:${definition.key}`;
      let exerciseId = exerciseIdBySharedKey.get(sharedKey);
      if (!exerciseId) {
        exerciseId = randomUUID();
        exerciseIdBySharedKey.set(sharedKey, exerciseId);
        exerciseRows.push({
          id: exerciseId,
          user_id: userId,
          is_global: false,
          name: buildScenarioExerciseName(scenario.id, definition),
          primary_muscle: definition.primaryMuscle,
          equipment: definition.equipment,
          measurement_type: mapMeasurementType(definition.measurementType) === "none" ? "reps" : mapMeasurementType(definition.measurementType),
          default_unit: definition.defaultUnit,
          how_to_short: `${PROGRESSION_QA_PREFIX} generated scenario exercise.`,
        });
      }

      const routineExercise = buildRoutineExerciseRow({
        userId,
        dayId,
        exerciseId,
        position: exerciseIndex + 1,
        exercise: definition,
      });
      routineExerciseRows.push(routineExercise);

      for (const [sessionIndex, exposure] of definition.sessions.entries()) {
        const sessionId = randomUUID();
        const sessionExercise = buildSessionExerciseRow({
          userId,
          sessionId,
          exerciseId,
          routineExercise,
          position: exerciseIndex + 1,
          exercise: definition,
        });
        sessionRows.push({
          id: sessionId,
          user_id: userId,
          routine_id: routineId,
          routine_day_index: dayIndex + 1,
          name: buildScenarioSessionName(scenario.id, day.name, definition.name),
          routine_day_name: day.name,
          day_name_override: null,
          performed_at: exposure.performedAt,
          duration_seconds: null,
          status: exposure.status,
          notes: `${PROGRESSION_QA_PREFIX} scenario=${scenario.id}; exposure=${sessionIndex + 1}`,
        });
        sessionExerciseRows.push(sessionExercise);
        setRows.push(...buildSetRows({
          userId,
          sessionExerciseId: sessionExercise.id,
          sets: exposure.sets,
        }));
      }
    }
  }

  for (const [contextIndex, contextRoutine] of (scenario.contextRoutines ?? []).entries()) {
    const contextRoutineId = randomUUID();
    contextRoutineRows.push({
      id: contextRoutineId,
      user_id: userId,
      name: `${buildScenarioRoutineName(scenario.id)} - context ${contextIndex + 1}`,
      cycle_length_days: Math.max(1, contextRoutine.days.length),
      start_date: "2026-04-01",
      timezone: "America/New_York",
      weight_unit: "lbs",
      default_progression_playbook_id: "double_progression",
      default_progression_playbook_config: { version: 1, loadIncrement: 5 },
    });

    for (const [dayIndex, day] of contextRoutine.days.entries()) {
      const dayId = randomUUID();
      dayRows.push({
        id: dayId,
        user_id: userId,
        routine_id: contextRoutineId,
        day_index: dayIndex + 1,
        name: day.name,
        is_rest: false,
        notes: `${scenario.prefix ?? PROGRESSION_QA_PREFIX} ${scenario.id} context`,
      });

      for (const [exerciseIndex, definition] of day.exercises.entries()) {
        const sharedKey = definition.sharedExerciseKey ?? `${scenario.id}:${definition.key}`;
        let exerciseId = exerciseIdBySharedKey.get(sharedKey);
        if (!exerciseId) {
          exerciseId = randomUUID();
          exerciseIdBySharedKey.set(sharedKey, exerciseId);
          exerciseRows.push({
            id: exerciseId,
            user_id: userId,
            is_global: false,
            name: buildScenarioExerciseName(scenario.id, definition),
            primary_muscle: definition.primaryMuscle,
            equipment: definition.equipment,
            measurement_type: mapMeasurementType(definition.measurementType) === "none" ? "reps" : mapMeasurementType(definition.measurementType),
            default_unit: definition.defaultUnit,
            how_to_short: `${scenario.prefix ?? PROGRESSION_QA_PREFIX} generated context exercise.`,
          });
        }

        const routineExercise = buildRoutineExerciseRow({
          userId,
          dayId,
          exerciseId,
          position: exerciseIndex + 1,
          exercise: definition,
        });
        routineExerciseRows.push(routineExercise);

        for (const [sessionIndex, exposure] of definition.sessions.entries()) {
          const sessionId = randomUUID();
          const sessionExercise = buildSessionExerciseRow({
            userId,
            sessionId,
            exerciseId,
            routineExercise,
            position: exerciseIndex + 1,
            exercise: definition,
          });
          sessionRows.push({
            id: sessionId,
            user_id: userId,
            routine_id: contextRoutineId,
            routine_day_index: dayIndex + 1,
            name: buildScenarioSessionName(scenario.id, day.name, definition.name),
            routine_day_name: day.name,
            day_name_override: null,
            performed_at: exposure.performedAt,
            duration_seconds: null,
            status: exposure.status,
            notes: `${scenario.prefix ?? PROGRESSION_QA_PREFIX} scenario=${scenario.id}; context=${contextIndex + 1}; exposure=${sessionIndex + 1}`,
          });
          sessionExerciseRows.push(sessionExercise);
          setRows.push(...buildSetRows({
            userId,
            sessionExerciseId: sessionExercise.id,
            sets: exposure.sets,
          }));
        }
      }
    }
  }

  if (exerciseRows.length > 0) {
    assertSuccess((await client.from("exercises").insert(exerciseRows)).error, `Unable to insert progression QA exercises for ${scenario.id}`);
  }
  if (contextRoutineRows.length > 0) {
    assertSuccess((await client.from("routines").insert(contextRoutineRows)).error, `Unable to insert progression QA context routines for ${scenario.id}`);
  }
  if (dayRows.length > 0) {
    assertSuccess((await client.from("routine_days").insert(dayRows)).error, `Unable to insert progression QA days for ${scenario.id}`);
  }
  if (routineExerciseRows.length > 0) {
    assertSuccess((await client.from("routine_day_exercises").insert(routineExerciseRows)).error, `Unable to insert progression QA routine exercises for ${scenario.id}`);
  }
  if (sessionRows.length > 0) {
    assertSuccess((await client.from("sessions").insert(sessionRows)).error, `Unable to insert progression QA sessions for ${scenario.id}`);
  }
  if (sessionExerciseRows.length > 0) {
    assertSuccess((await client.from("session_exercises").insert(sessionExerciseRows)).error, `Unable to insert progression QA session exercises for ${scenario.id}`);
  }
  if (setRows.length > 0) {
    assertSuccess((await client.from("sets").insert(setRows)).error, `Unable to insert progression QA sets for ${scenario.id}`);
  }

  return {
    scenarioId: scenario.id,
    routineId,
    routineName,
    dayCount: dayRows.length,
    exerciseCount: routineExerciseRows.length,
    sessionCount: sessionRows.length,
    setCount: setRows.length,
    expected: scenario.expected,
  };
}

async function seedWritableProgressionScenarios(client, userId, scenarioIds) {
  const selectedScenarios = scenarioIds.map((id) => {
    const scenario = getWritableProgressionScenarioDefinition(id);
    if (!scenario) {
      throw new Error(`Unknown progression QA scenario: ${id}`);
    }
    return scenario;
  });

  await resetWritableProgressionScenarios(client, userId, scenarioIds);
  const seeded = [];
  for (const scenario of selectedScenarios) {
    seeded.push(await seedWritableProgressionScenario(client, userId, scenario));
  }

  if (seeded[0]?.routineId) {
    assertSuccess(
      (await client.from("profiles").update({ active_routine_id: seeded[0].routineId }).eq("id", userId)).error,
      "Unable to activate seeded progression QA routine",
    );
  }

  return seeded;
}

async function main() {
  const parsed = parseArgs();
  const dryRun = parsed.flags.has("dry-run");
  const command = parsed.flags.has("reset") ? "reset" : "seed";
  const scenarioFlags = [...parsed.flags].filter((flag) => flag.startsWith("with-"));
  const scenarioSelection = getScenarioSelection(parsed);

  if (dryRun) {
    printJson(dryRunPayload(command, {
      scenarioFlags,
      progressionScenarioSelection: scenarioSelection,
      plan: command === "reset"
        ? scenarioSelection.length > 0
          ? "Find Codex QA auth user, delete only selected [QA-PROGRESSION] scenario rows, preserve auth user."
          : "Find Codex QA auth user, delete only Codex-owned app rows, preserve auth user."
        : scenarioSelection.length > 0
          ? "Create/update Codex QA auth user, mark profile automation, seed selected writable progression scenarios."
          : "Create/update Codex QA auth user, mark profile automation, clone selected source routine.",
    }));
    return;
  }

  if (scenarioFlags.length > 0) {
    throw new Error(`Scenario history flags are reserved for the next QA fixture pass and are only reported in --dry-run today: ${scenarioFlags.join(", ")}`);
  }

  const client = createServiceClient();
  const { user, created } = await ensureCodexQaUser(client);
  await ensureCodexProfile(client, user.id);

  if (command === "reset") {
    if (scenarioSelection.length > 0) {
      const reset = await resetWritableProgressionScenarios(client, user.id, scenarioSelection);
      printJson({
        command,
        email: String(user.email ?? "").toLowerCase(),
        userId: user.id,
        authUserCreated: created,
        scenarios: scenarioSelection,
        reset,
      });
      return;
    }

    await resetCodexQaData(client, user.id);
    printJson({
      command,
      email: String(user.email ?? "").toLowerCase(),
      userId: user.id,
      authUserCreated: created,
      reset: "Codex-owned app rows removed; auth user preserved.",
    });
    return;
  }

  if (scenarioSelection.length > 0) {
    const seeded = await seedWritableProgressionScenarios(client, user.id, scenarioSelection);
    printJson({
      command,
      email: String(user.email ?? "").toLowerCase(),
      userId: user.id,
      authUserCreated: created,
      scenarios: seeded,
      activeRoutineId: seeded[0]?.routineId ?? null,
      routes: {
        today: "/today",
        audit: "/dev/progression-audit",
        devScenarios: "/dev/progression-scenarios",
      },
      reset: scenarioSelection.map((scenarioId) => `npm run qa:codex:reset -- --scenario ${scenarioId}`),
    });
    return;
  }

  const sourceRoutine = await resolveSourceRoutine(client);
  await resetCodexQaData(client, user.id);
  await ensureCodexProfile(client, user.id);
  const clone = await cloneRoutine(client, user.id, sourceRoutine);

  printJson({
    command,
    email: String(user.email ?? "").toLowerCase(),
    userId: user.id,
    authUserCreated: created,
    clone,
    routes: {
      routines: "/routines",
      today: "/today",
      devScenarios: "/dev/progression-scenarios",
    },
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
