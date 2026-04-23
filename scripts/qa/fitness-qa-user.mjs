#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  QA_BASELINE,
  FITNESS_QA_EMAIL_ENV,
  FITNESS_QA_PASSWORD_ENV,
  FITNESS_QA_JUNK_USER_REGEX_ENV,
  buildSessionCookies,
  createAnonClient,
  createServiceRoleClient,
  ensureDirectoryForFile,
  envPath,
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
  getOptionalEnv,
  getQaCredentials,
  resolveBaseUrl,
  sessionArtifactPath,
  shiftDate,
} from "./fitness-qa-config.mjs";

const currentFilePath = fileURLToPath(import.meta.url);

function parseArgs(argv = process.argv.slice(2)) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      positionals.push(entry);
      continue;
    }

    const body = entry.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      flags[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags[body] = next;
      index += 1;
      continue;
    }

    flags[body] = true;
  }

  return { positionals, flags };
}

function isRelationMissing(error) {
  return error?.code === "42P01";
}

function assertSuccess(error, message) {
  if (!error) {
    return;
  }

  throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
}

function computeEstimatedOneRepMax(weight, reps) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return null;
  }

  return Math.round(weight * (1 + (reps / 30)));
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
  const normalizedEmail = email.trim().toLowerCase();
  const users = await listAllUsers(adminClient);
  return users.find((user) => String(user.email ?? "").trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function ensureQaUser() {
  const adminClient = createServiceRoleClient();
  const credentials = getQaCredentials();
  const existingUser = await findUserByEmail(adminClient, credentials.email);
  const adminAttributes = {
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: {
      display_name: "Fitness QA User",
      atlas_qa_label: "Fitness Permanent QA User",
    },
    app_metadata: {
      atlas_qa_user: true,
      atlas_qa_scope: "fitness-permanent",
    },
  };

  if (!existingUser) {
    const { data, error } = await adminClient.auth.admin.createUser(adminAttributes);
    assertSuccess(error, `Unable to create ${FITNESS_QA_EMAIL_ENV}`);
    if (!data.user) {
      throw new Error(`Supabase did not return the created QA user for ${credentials.email}.`);
    }

    return {
      created: true,
      user: data.user,
    };
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(existingUser.id, adminAttributes);
  assertSuccess(error, `Unable to synchronize ${FITNESS_QA_EMAIL_ENV}`);
  if (!data.user) {
    throw new Error(`Supabase did not return the synchronized QA user for ${credentials.email}.`);
  }

  return {
    created: false,
    user: data.user,
  };
}

async function loadBaselineExerciseCatalog(serviceRoleClient) {
  const exerciseNames = QA_BASELINE.exercises.map((exercise) => exercise.name);
  const { data, error } = await serviceRoleClient
    .from("exercises")
    .select("id, name, measurement_type, default_unit")
    .is("user_id", null)
    .in("name", exerciseNames);

  assertSuccess(error, "Unable to load the baseline exercise catalog");

  const byName = new Map((data ?? []).map((row) => [row.name, row]));
  for (const exercise of QA_BASELINE.exercises) {
    if (!byName.has(exercise.name)) {
      throw new Error(`Baseline reset cannot continue because the seeded global exercise "${exercise.name}" is missing.`);
    }
  }

  return byName;
}

async function deleteUserOwnedRows(serviceRoleClient, userId) {
  const deleteTables = [
    "session_follow_up_jobs",
    "exercise_stats",
    "sets",
    "session_exercises",
    "sessions",
    "routine_day_exercises",
    "routine_days",
    "routines",
  ];

  for (const table of deleteTables) {
    const { error } = await serviceRoleClient.from(table).delete().eq("user_id", userId);
    if (error && !isRelationMissing(error)) {
      throw new Error(`Unable to reset ${table} for QA user ${userId}: ${error.message ?? "Unknown Supabase error"}`);
    }
  }

  const { error: deleteProfileError } = await serviceRoleClient.from("profiles").delete().eq("id", userId);
  if (deleteProfileError && !isRelationMissing(deleteProfileError)) {
    throw new Error(`Unable to reset profiles for QA user ${userId}: ${deleteProfileError.message ?? "Unknown Supabase error"}`);
  }

  const { error: deleteCustomExercisesError } = await serviceRoleClient.from("exercises").delete().eq("user_id", userId);
  if (deleteCustomExercisesError && !isRelationMissing(deleteCustomExercisesError)) {
    throw new Error(`Unable to reset custom exercises for QA user ${userId}: ${deleteCustomExercisesError.message ?? "Unknown Supabase error"}`);
  }
}

function buildBaselineDataset(userId, exerciseCatalog) {
  const today = new Date();
  const startDate = formatDateInTimeZone(today, QA_BASELINE.profileTimeZone);
  const latestDate = shiftDate(today, -2);
  const priorDate = shiftDate(today, -6);
  const exercises = Object.fromEntries(
    QA_BASELINE.exercises.map((exercise) => [exercise.key, exerciseCatalog.get(exercise.name)]),
  );

  return {
    profile: {
      id: userId,
      timezone: QA_BASELINE.profileTimeZone,
      active_routine_id: QA_BASELINE.routineId,
      preferred_weight_unit: "lbs",
      preferred_distance_unit: "mi",
    },
    routine: {
      id: QA_BASELINE.routineId,
      user_id: userId,
      name: QA_BASELINE.routineName,
      cycle_length_days: 1,
      start_date: startDate,
      timezone: QA_BASELINE.profileTimeZone,
      weight_unit: "lbs",
    },
    routineDay: {
      id: QA_BASELINE.routineDayId,
      user_id: userId,
      routine_id: QA_BASELINE.routineId,
      day_index: 1,
      name: QA_BASELINE.dayName,
      is_rest: false,
      notes: "Deterministic QA baseline for the Fitness local loop.",
    },
    routineDayExercises: [
      {
        id: QA_BASELINE.routineDayExerciseIds.squat,
        user_id: userId,
        routine_day_id: QA_BASELINE.routineDayId,
        exercise_id: exercises.squat.id,
        position: 0,
        target_sets: 4,
        target_reps_min: 5,
        target_reps_max: 5,
        target_weight: 225,
        target_weight_unit: "lbs",
        measurement_type: exercises.squat.measurement_type ?? "reps",
        default_unit: exercises.squat.default_unit ?? "reps",
        notes: "Build to one top set before backing off.",
      },
      {
        id: QA_BASELINE.routineDayExerciseIds.lunge,
        user_id: userId,
        routine_day_id: QA_BASELINE.routineDayId,
        exercise_id: exercises.lunge.id,
        position: 1,
        target_sets: 3,
        target_reps_min: 10,
        target_reps_max: 12,
        target_weight: 40,
        target_weight_unit: "lbs",
        measurement_type: exercises.lunge.measurement_type ?? "reps",
        default_unit: exercises.lunge.default_unit ?? "reps",
        notes: "Stay long through each stride.",
      },
      {
        id: QA_BASELINE.routineDayExerciseIds.pullup,
        user_id: userId,
        routine_day_id: QA_BASELINE.routineDayId,
        exercise_id: exercises.pullup.id,
        position: 2,
        target_sets: 3,
        target_reps_min: 5,
        target_reps_max: 6,
        target_weight: 25,
        target_weight_unit: "lbs",
        measurement_type: exercises.pullup.measurement_type ?? "reps",
        default_unit: exercises.pullup.default_unit ?? "reps",
        notes: "Own the hang and keep the rib cage stacked.",
      },
    ],
    sessions: [
      {
        id: QA_BASELINE.sessionIds.latest,
        user_id: userId,
        performed_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
        notes: "Top set moved well. Keep bracing consistent before the fourth squat set.",
        routine_id: QA_BASELINE.routineId,
        routine_day_index: 1,
        name: QA_BASELINE.routineName,
        routine_day_name: QA_BASELINE.dayName,
        day_name_override: QA_BASELINE.dayName,
        duration_seconds: 3480,
        status: "completed",
      },
      {
        id: QA_BASELINE.sessionIds.prior,
        user_id: userId,
        performed_at: formatDateTimeInTimeZone(priorDate, QA_BASELINE.profileTimeZone, 18, 15),
        notes: "Prior baseline session used to prove history deltas.",
        routine_id: QA_BASELINE.routineId,
        routine_day_index: 1,
        name: QA_BASELINE.routineName,
        routine_day_name: QA_BASELINE.dayName,
        day_name_override: QA_BASELINE.dayName,
        duration_seconds: 3240,
        status: "completed",
      },
    ],
    sessionExercises: [
      {
        id: QA_BASELINE.sessionExerciseIds.latestSquat,
        session_id: QA_BASELINE.sessionIds.latest,
        user_id: userId,
        exercise_id: exercises.squat.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.squat,
        position: 0,
        performed_index: 0,
        notes: "Stay over mid-foot.",
        is_skipped: false,
        measurement_type: "reps",
        default_unit: "reps",
        target_sets_min: 4,
        target_sets_max: 4,
        target_reps_min: 5,
        target_reps_max: 5,
        target_weight_min: 225,
        target_weight_max: 245,
        target_weight_unit: "lbs",
      },
      {
        id: QA_BASELINE.sessionExerciseIds.latestLunge,
        session_id: QA_BASELINE.sessionIds.latest,
        user_id: userId,
        exercise_id: exercises.lunge.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.lunge,
        position: 1,
        performed_index: 1,
        notes: "Long stride, soft front knee.",
        is_skipped: false,
        measurement_type: "reps",
        default_unit: "reps",
        target_sets_min: 3,
        target_sets_max: 3,
        target_reps_min: 10,
        target_reps_max: 12,
        target_weight_min: 35,
        target_weight_max: 40,
        target_weight_unit: "lbs",
      },
      {
        id: QA_BASELINE.sessionExerciseIds.latestPullup,
        session_id: QA_BASELINE.sessionIds.latest,
        user_id: userId,
        exercise_id: exercises.pullup.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.pullup,
        position: 2,
        performed_index: 2,
        notes: "Dead hang between reps.",
        is_skipped: false,
        measurement_type: "reps",
        default_unit: "reps",
        target_sets_min: 3,
        target_sets_max: 3,
        target_reps_min: 5,
        target_reps_max: 6,
        target_weight_min: 20,
        target_weight_max: 25,
        target_weight_unit: "lbs",
      },
      {
        id: QA_BASELINE.sessionExerciseIds.priorSquat,
        session_id: QA_BASELINE.sessionIds.prior,
        user_id: userId,
        exercise_id: exercises.squat.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.squat,
        position: 0,
        performed_index: 0,
        notes: "Earlier squat reference session.",
        is_skipped: false,
        measurement_type: "reps",
        default_unit: "reps",
        target_sets_min: 3,
        target_sets_max: 3,
        target_reps_min: 5,
        target_reps_max: 5,
        target_weight_min: 215,
        target_weight_max: 225,
        target_weight_unit: "lbs",
      },
      {
        id: QA_BASELINE.sessionExerciseIds.priorPullup,
        session_id: QA_BASELINE.sessionIds.prior,
        user_id: userId,
        exercise_id: exercises.pullup.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.pullup,
        position: 1,
        performed_index: 1,
        notes: "Earlier pull-up reference session.",
        is_skipped: false,
        measurement_type: "reps",
        default_unit: "reps",
        target_sets_min: 3,
        target_sets_max: 3,
        target_reps_min: 5,
        target_reps_max: 6,
        target_weight_min: 15,
        target_weight_max: 20,
        target_weight_unit: "lbs",
      },
    ],
    sets: [
      { id: "3dd8f6e1-b76a-4cb2-a11e-d0a5ce71a130", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestSquat, user_id: userId, set_index: 0, weight: 225, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "64547f8e-7271-43e4-b73d-e77f8a6fe80d", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestSquat, user_id: userId, set_index: 1, weight: 235, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "2378ae31-c06f-4518-a11a-9196d7951c97", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestSquat, user_id: userId, set_index: 2, weight: 245, reps: 5, is_warmup: false, notes: "Top set", duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8.5, weight_unit: "lbs" },
      { id: "8dd3ff93-bd09-4ca6-b8d9-f8e8d31f8f4d", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestSquat, user_id: userId, set_index: 3, weight: 235, reps: 6, is_warmup: false, notes: "Back-off", duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "07a2ae31-8996-48fe-a71b-3f09ab1129b8", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestLunge, user_id: userId, set_index: 0, weight: 35, reps: 12, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7, weight_unit: "lbs" },
      { id: "328c2e94-e64a-478f-9b5d-470cf6d98c31", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestLunge, user_id: userId, set_index: 1, weight: 35, reps: 12, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "584dc976-1f64-4693-94b9-3bdb37d9a57a", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestLunge, user_id: userId, set_index: 2, weight: 40, reps: 10, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "6f4ceb07-86c0-4e03-a0ec-1a8c2c8b638f", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestPullup, user_id: userId, set_index: 0, weight: 20, reps: 6, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "c1c431b3-9e9c-4318-85c0-19f9e6108c57", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestPullup, user_id: userId, set_index: 1, weight: 25, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "33755387-bba1-45a3-bdf2-bd4873398827", session_exercise_id: QA_BASELINE.sessionExerciseIds.latestPullup, user_id: userId, set_index: 2, weight: 25, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8.5, weight_unit: "lbs" },
      { id: "07cdd5f0-9c6b-4985-a175-0cae413f3147", session_exercise_id: QA_BASELINE.sessionExerciseIds.priorSquat, user_id: userId, set_index: 0, weight: 215, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7, weight_unit: "lbs" },
      { id: "96ad4f37-d82c-491b-a0c6-6db2a6f48202", session_exercise_id: QA_BASELINE.sessionExerciseIds.priorSquat, user_id: userId, set_index: 1, weight: 225, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "a01c6fac-517b-42f8-a24b-44c62ac675d0", session_exercise_id: QA_BASELINE.sessionExerciseIds.priorPullup, user_id: userId, set_index: 0, weight: 15, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7, weight_unit: "lbs" },
      { id: "73b138fe-eb3d-4b6d-9e7f-549eebb1ab0b", session_exercise_id: QA_BASELINE.sessionExerciseIds.priorPullup, user_id: userId, set_index: 1, weight: 20, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
    ],
    exerciseStats: [
      {
        user_id: userId,
        exercise_id: exercises.squat.id,
        last_weight: 235,
        last_reps: 6,
        last_unit: "lbs",
        last_performed_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
        pr_weight: 245,
        pr_reps: 5,
        pr_est_1rm: computeEstimatedOneRepMax(245, 5),
        actual_pr_weight: 245,
        actual_pr_reps: 5,
        actual_pr_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
      },
      {
        user_id: userId,
        exercise_id: exercises.lunge.id,
        last_weight: 40,
        last_reps: 10,
        last_unit: "lbs",
        last_performed_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
        pr_weight: 40,
        pr_reps: 10,
        pr_est_1rm: computeEstimatedOneRepMax(40, 10),
        actual_pr_weight: 40,
        actual_pr_reps: 10,
        actual_pr_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
      },
      {
        user_id: userId,
        exercise_id: exercises.pullup.id,
        last_weight: 25,
        last_reps: 5,
        last_unit: "lbs",
        last_performed_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
        pr_weight: 25,
        pr_reps: 5,
        pr_est_1rm: computeEstimatedOneRepMax(25, 5),
        actual_pr_weight: 25,
        actual_pr_reps: 5,
        actual_pr_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
      },
    ],
  };
}

export async function resetQaUserData() {
  const { user } = await ensureQaUser();
  const serviceRoleClient = createServiceRoleClient();
  const exerciseCatalog = await loadBaselineExerciseCatalog(serviceRoleClient);

  await deleteUserOwnedRows(serviceRoleClient, user.id);

  const dataset = buildBaselineDataset(user.id, exerciseCatalog);

  assertSuccess(
    (await serviceRoleClient.from("profiles").upsert(dataset.profile, { onConflict: "id" })).error,
    "Unable to seed the QA profile",
  );
  assertSuccess((await serviceRoleClient.from("routines").insert(dataset.routine)).error, "Unable to seed the QA routine");
  assertSuccess((await serviceRoleClient.from("routine_days").insert(dataset.routineDay)).error, "Unable to seed the QA routine day");
  assertSuccess(
    (await serviceRoleClient.from("routine_day_exercises").insert(dataset.routineDayExercises)).error,
    "Unable to seed the QA routine day exercises",
  );
  assertSuccess((await serviceRoleClient.from("sessions").insert(dataset.sessions)).error, "Unable to seed QA history sessions");
  assertSuccess(
    (await serviceRoleClient.from("session_exercises").insert(dataset.sessionExercises)).error,
    "Unable to seed QA session exercises",
  );
  assertSuccess((await serviceRoleClient.from("sets").insert(dataset.sets)).error, "Unable to seed QA sets");

  const exerciseStatsInsert = await serviceRoleClient.from("exercise_stats").upsert(dataset.exerciseStats, {
    onConflict: "user_id,exercise_id",
  });
  if (exerciseStatsInsert.error && !isRelationMissing(exerciseStatsInsert.error)) {
    throw new Error(`Unable to seed QA exercise stats: ${exerciseStatsInsert.error.message ?? "Unknown Supabase error"}`);
  }

  return {
    userId: user.id,
    email: String(user.email ?? "").toLowerCase(),
    routineId: QA_BASELINE.routineId,
    latestSessionId: QA_BASELINE.sessionIds.latest,
  };
}

export async function bootstrapQaSession() {
  const credentials = getQaCredentials();
  const anonClient = createAnonClient();

  await ensureQaUser();

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  assertSuccess(error, "Unable to sign in as the reusable Fitness QA user");

  if (!data.session || !data.user) {
    throw new Error("Supabase sign-in did not return a session for the reusable Fitness QA user.");
  }

  const baseUrl = resolveBaseUrl();
  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    sessionFile: sessionArtifactPath,
    email: credentials.email,
    userId: data.user.id,
    latestSessionId: QA_BASELINE.sessionIds.latest,
    cookies: buildSessionCookies(data.session, baseUrl),
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? null,
    },
  };

  ensureDirectoryForFile(sessionArtifactPath);
  await fs.writeFile(sessionArtifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

export async function readQaSessionArtifact() {
  const raw = await fs.readFile(sessionArtifactPath, "utf8");
  return JSON.parse(raw);
}

async function cleanupCodexJunkUsers({ apply, patternSource }) {
  const qaEmail = getQaCredentials().email;
  const explicitPattern = patternSource ?? getOptionalEnv(FITNESS_QA_JUNK_USER_REGEX_ENV);

  if (!explicitPattern) {
    throw new Error(`Cleanup requires --pattern or ${FITNESS_QA_JUNK_USER_REGEX_ENV}. The pattern must target Codex-tagged junk users only.`);
  }

  if (!/codex/i.test(explicitPattern)) {
    throw new Error("Cleanup refused because the supplied junk-user regex does not clearly target Codex-created accounts.");
  }

  const adminClient = createServiceRoleClient();
  const regex = new RegExp(explicitPattern, "i");
  const allUsers = await listAllUsers(adminClient);
  const matches = allUsers.filter((user) => {
    const email = String(user.email ?? "").trim().toLowerCase();
    return email.length > 0 && email !== qaEmail && regex.test(email);
  });

  if (!apply) {
    return {
      apply: false,
      pattern: explicitPattern,
      matchedCount: matches.length,
      matchedEmails: matches.map((user) => String(user.email ?? "").toLowerCase()),
    };
  }

  for (const user of matches) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id, false);
    assertSuccess(error, `Unable to delete matched junk QA user ${user.email ?? user.id}`);
  }

  return {
    apply: true,
    pattern: explicitPattern,
    deletedCount: matches.length,
    deletedEmails: matches.map((user) => String(user.email ?? "").toLowerCase()),
  };
}

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function usage() {
  process.stderr.write(
    [
      "Usage: node scripts/qa/fitness-qa-user.mjs <ensure|reset|session|cleanup>",
      "",
      `Required local secrets: ${FITNESS_QA_EMAIL_ENV}, ${FITNESS_QA_PASSWORD_ENV}, SUPABASE_SERVICE_ROLE_KEY.`,
      `Preferred source: ${envPath}.`,
    ].join("\n"),
  );
}

async function main() {
  const { positionals, flags } = parseArgs();
  const command = positionals[0];

  if (!command) {
    usage();
    process.exit(1);
  }

  if (command === "ensure") {
    const result = await ensureQaUser();
    printResult({
      command,
      email: String(result.user.email ?? "").toLowerCase(),
      userId: result.user.id,
      created: result.created,
      localEnvPath: envPath,
    });
    return;
  }

  if (command === "reset") {
    const result = await resetQaUserData();
    printResult({
      command,
      ...result,
      latestSessionDetailPath: `/history/${result.latestSessionId}`,
    });
    return;
  }

  if (command === "session") {
    const result = await bootstrapQaSession();
    printResult({
      command,
      email: result.email,
      userId: result.userId,
      baseUrl: result.baseUrl,
      sessionArtifactPath,
      latestSessionDetailPath: `/history/${result.latestSessionId}`,
    });
    return;
  }

  if (command === "cleanup") {
    const result = await cleanupCodexJunkUsers({
      apply: flags.apply === true,
      patternSource: typeof flags.pattern === "string" ? flags.pattern : null,
    });
    printResult({
      command,
      ...result,
      qaEmailEnv: FITNESS_QA_EMAIL_ENV,
    });
    return;
  }

  usage();
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
