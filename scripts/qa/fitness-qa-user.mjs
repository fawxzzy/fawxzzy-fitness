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
  NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV,
  NEXT_PUBLIC_SUPABASE_URL_ENV,
  QA_SESSION_STALE_BUFFER_SECONDS,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  buildSessionCookies,
  createAnonClient,
  createServiceRoleClient,
  ensureDirectoryForFile,
  envPath,
  formatUnixSecondsToIso,
  formatDateInTimeZone,
  formatDateTimeInTimeZone,
  getOptionalEnv,
  getQaCredentials,
  hasOptionalEnv,
  listMissingEnv,
  resolveBaseUrl,
  sessionArtifactPath,
  shiftDate,
} from "./fitness-qa-config.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const QA_SESSION_CHECK_LABELS = {
  "missing-env": "blocked: missing QA env",
  "stale-session": "blocked: stale QA session",
  "invalid-session": "blocked: invalid QA session",
  "valid-session": "valid QA session",
};

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

function buildMissingEnvError(missingEnv, purpose) {
  return new Error(
    `Missing required env for ${purpose}: ${missingEnv.join(", ")}. Set them in ${envPath} or the current shell before running this QA workflow.`,
  );
}

function summarizeQaSessionStatus(status) {
  return QA_SESSION_CHECK_LABELS[status] ?? status;
}

function getQaSessionEnvReport({
  requireCredentials = true,
  requireAnonClient = false,
  requireServiceRole = false,
} = {}) {
  const requiredEnv = [];
  if (requireCredentials) {
    requiredEnv.push(FITNESS_QA_EMAIL_ENV, FITNESS_QA_PASSWORD_ENV);
  }

  if (requireAnonClient) {
    requiredEnv.push(NEXT_PUBLIC_SUPABASE_URL_ENV, NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV);
  }

  if (requireServiceRole) {
    requiredEnv.push(SUPABASE_SERVICE_ROLE_KEY_ENV);
  }

  const missingEnv = listMissingEnv(requiredEnv);
  return {
    requiredEnv,
    missingEnv,
    ok: missingEnv.length === 0,
  };
}

function normalizeSessionArtifact(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return null;
  }

  const session = artifact.session && typeof artifact.session === "object" ? artifact.session : null;
  const expiresAtEpochSeconds = Number(
    session?.expiresAt
      ?? artifact.expiresAtEpochSeconds
      ?? artifact.cookies?.[0]?.expires
      ?? Number.NaN,
  );
  const baseUrl = typeof artifact.baseUrl === "string" && artifact.baseUrl.trim().length > 0
    ? artifact.baseUrl.replace(/\/$/, "")
    : null;
  const email = typeof artifact.email === "string" && artifact.email.trim().length > 0
    ? artifact.email.trim().toLowerCase()
    : null;

  return {
    artifact,
    baseUrl,
    email,
    userId: typeof artifact.userId === "string" ? artifact.userId : null,
    createdAt: typeof artifact.createdAt === "string"
      ? artifact.createdAt
      : (typeof artifact.generatedAt === "string" ? artifact.generatedAt : null),
    expiresAtEpochSeconds,
    expiresAt: formatUnixSecondsToIso(expiresAtEpochSeconds),
    accessToken: typeof session?.accessToken === "string" ? session.accessToken : null,
    refreshToken: typeof session?.refreshToken === "string" ? session.refreshToken : null,
    cookieCount: Array.isArray(artifact.cookies) ? artifact.cookies.length : 0,
  };
}

function classifyQaSessionArtifact(artifact, {
  expectedEmail = null,
  staleBufferSeconds = QA_SESSION_STALE_BUFFER_SECONDS,
} = {}) {
  const normalized = normalizeSessionArtifact(artifact);
  if (!normalized) {
    return {
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: "QA session artifact is not a valid JSON object.",
    };
  }

  if (!normalized.baseUrl) {
    return {
      ...normalized,
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: "QA session artifact is missing baseUrl.",
    };
  }

  if (!normalized.accessToken || !normalized.refreshToken) {
    return {
      ...normalized,
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: "QA session artifact is missing reusable auth tokens.",
    };
  }

  if (!Number.isFinite(normalized.expiresAtEpochSeconds)) {
    return {
      ...normalized,
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: "QA session artifact is missing a valid expiresAt timestamp.",
    };
  }

  if (expectedEmail && normalized.email && normalized.email !== expectedEmail) {
    return {
      ...normalized,
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: `QA session artifact email ${normalized.email} does not match ${FITNESS_QA_EMAIL_ENV}.`,
    };
  }

  const secondsRemaining = normalized.expiresAtEpochSeconds - Math.floor(Date.now() / 1000);
  if (secondsRemaining <= staleBufferSeconds) {
    return {
      ...normalized,
      status: "stale-session",
      summary: summarizeQaSessionStatus("stale-session"),
      reason: `QA session expires in ${secondsRemaining} seconds.`,
      secondsRemaining,
    };
  }

  return {
    ...normalized,
    status: "valid-session",
    summary: summarizeQaSessionStatus("valid-session"),
    reason: null,
    secondsRemaining,
  };
}

async function signInQaUser(anonClient, credentials) {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  assertSuccess(error, "Unable to sign in as the reusable Fitness QA user");

  if (!data.session || !data.user) {
    throw new Error("Supabase sign-in did not return a session for the reusable Fitness QA user.");
  }

  return data;
}

function buildQaSessionArtifactPayload({
  baseUrl,
  email,
  userId,
  latestSessionId,
  session,
  createdAt = new Date().toISOString(),
}) {
  const expiresAtEpochSeconds = Number(session.expires_at ?? Number.NaN);
  return {
    version: 2,
    createdAt,
    generatedAt: createdAt,
    baseUrl,
    sessionFile: sessionArtifactPath,
    email,
    userId,
    latestSessionId,
    expiresAt: formatUnixSecondsToIso(expiresAtEpochSeconds),
    expiresAtEpochSeconds,
    authStateSummary: {
      status: "authenticated",
      summary: summarizeQaSessionStatus("valid-session"),
      source: "password-sign-in",
      createdAt,
      expiresAt: formatUnixSecondsToIso(expiresAtEpochSeconds),
      expiresAtEpochSeconds,
      hasReusableCookies: true,
    },
    cookies: buildSessionCookies(session, baseUrl),
    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
    },
  };
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

  // The reusable QA baseline uses fixed ids across runs. If the QA email/user changes,
  // older rows can survive under a different user_id and collide on reseed.
  const baselineSessionExerciseIds = Object.values(QA_BASELINE.sessionExerciseIds);
  const baselineSessionIds = Object.values(QA_BASELINE.sessionIds);
  const baselineRoutineDayExerciseIds = Object.values(QA_BASELINE.routineDayExerciseIds);

  const fixedIdCleanup = [
    { table: "sets", column: "session_exercise_id", values: baselineSessionExerciseIds },
    { table: "session_exercises", column: "id", values: baselineSessionExerciseIds },
    { table: "sessions", column: "id", values: baselineSessionIds },
    { table: "routine_day_exercises", column: "id", values: baselineRoutineDayExerciseIds },
    { table: "routine_days", column: "id", values: [QA_BASELINE.routineDayId] },
    { table: "routines", column: "id", values: [QA_BASELINE.routineId] },
  ];

  for (const cleanup of fixedIdCleanup) {
    const { error } = await serviceRoleClient.from(cleanup.table).delete().in(cleanup.column, cleanup.values);
    if (error && !isRelationMissing(error)) {
      throw new Error(
        `Unable to clear fixed QA baseline rows from ${cleanup.table}: ${error.message ?? "Unknown Supabase error"}`,
      );
    }
  }
}

function buildBaselineDataset(userId, exerciseCatalog) {
  const today = new Date();
  const startDate = formatDateInTimeZone(today, QA_BASELINE.profileTimeZone);
  const activeDate = shiftDate(today, -1);
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
        id: QA_BASELINE.sessionIds.active,
        user_id: userId,
        performed_at: formatDateTimeInTimeZone(activeDate, QA_BASELINE.profileTimeZone, 17, 45),
        notes: "Active QA session reserved for protected Current Session mutation proof.",
        routine_id: QA_BASELINE.routineId,
        routine_day_index: 1,
        name: QA_BASELINE.routineName,
        routine_day_name: QA_BASELINE.dayName,
        day_name_override: QA_BASELINE.dayName,
        duration_seconds: null,
        status: "in_progress",
      },
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
        id: QA_BASELINE.sessionExerciseIds.activeSquat,
        session_id: QA_BASELINE.sessionIds.active,
        user_id: userId,
        exercise_id: exercises.squat.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.squat,
        position: 0,
        performed_index: 0,
        notes: "Active session squat proof lane.",
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
        id: QA_BASELINE.sessionExerciseIds.activeLunge,
        session_id: QA_BASELINE.sessionIds.active,
        user_id: userId,
        exercise_id: exercises.lunge.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.lunge,
        position: 1,
        performed_index: 1,
        notes: "Active session lunge proof lane.",
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
        id: QA_BASELINE.sessionExerciseIds.activePullup,
        session_id: QA_BASELINE.sessionIds.active,
        user_id: userId,
        exercise_id: exercises.pullup.id,
        routine_day_exercise_id: QA_BASELINE.routineDayExerciseIds.pullup,
        position: 2,
        performed_index: 2,
        notes: "Active session pull-up proof lane.",
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
        notes: null,
        copilot_feedback_signal: "form_breakdown",
        copilot_feedback_note: "Stride felt sloppy once the incline ramped up.",
        copilot_feedback_effort: 8,
        copilot_feedback_updated_at: formatDateTimeInTimeZone(latestDate, QA_BASELINE.profileTimeZone, 12, 30),
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
      { id: "927d4d40-14fd-4200-ba77-e66534dbe50d", session_exercise_id: QA_BASELINE.sessionExerciseIds.activeSquat, user_id: userId, set_index: 0, weight: 225, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "31b50788-f8e7-43a7-ba51-c53d26a797fe", session_exercise_id: QA_BASELINE.sessionExerciseIds.activeSquat, user_id: userId, set_index: 1, weight: 235, reps: 5, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "cd77a70a-c426-4d27-9238-0da36f0db0a0", session_exercise_id: QA_BASELINE.sessionExerciseIds.activeLunge, user_id: userId, set_index: 0, weight: 35, reps: 12, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7, weight_unit: "lbs" },
      { id: "1ef3584f-484a-4f9b-9f4f-f27c8c468be1", session_exercise_id: QA_BASELINE.sessionExerciseIds.activeLunge, user_id: userId, set_index: 1, weight: 35, reps: 12, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
      { id: "701b3471-a24d-4ac1-a4a0-7e736cb33b03", session_exercise_id: QA_BASELINE.sessionExerciseIds.activeLunge, user_id: userId, set_index: 2, weight: 40, reps: 10, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 8, weight_unit: "lbs" },
      { id: "991c544b-dae4-4b99-88ff-dfd63af754fb", session_exercise_id: QA_BASELINE.sessionExerciseIds.activePullup, user_id: userId, set_index: 0, weight: 20, reps: 6, is_warmup: false, notes: null, duration_seconds: null, distance: null, distance_unit: null, calories: null, rpe: 7.5, weight_unit: "lbs" },
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
  const envReport = getQaSessionEnvReport({
    requireCredentials: true,
    requireAnonClient: true,
  });
  if (!envReport.ok) {
    throw buildMissingEnvError(envReport.missingEnv, "qa:session");
  }

  const credentials = getQaCredentials();
  const anonClient = createAnonClient();
  let data;

  try {
    data = await signInQaUser(anonClient, credentials);
  } catch (signInError) {
    if (!hasOptionalEnv(SUPABASE_SERVICE_ROLE_KEY_ENV)) {
      throw new Error(
        `Unable to bootstrap a QA session with ${FITNESS_QA_EMAIL_ENV}/${FITNESS_QA_PASSWORD_ENV} alone. `
        + `Set ${SUPABASE_SERVICE_ROLE_KEY_ENV} as well if this lane needs Codex to create or resync the reusable QA user. `
        + `Original sign-in failure: ${signInError instanceof Error ? signInError.message : String(signInError)}`,
      );
    }

    await ensureQaUser();
    data = await signInQaUser(anonClient, credentials);
  }

  const baseUrl = resolveBaseUrl();
  const payload = buildQaSessionArtifactPayload({
    baseUrl,
    email: credentials.email,
    userId: data.user.id,
    latestSessionId: QA_BASELINE.sessionIds.latest,
    session: data.session,
  });

  ensureDirectoryForFile(sessionArtifactPath);
  await fs.writeFile(sessionArtifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

export async function readQaSessionArtifact() {
  const raw = await fs.readFile(sessionArtifactPath, "utf8");
  return JSON.parse(raw);
}

export async function inspectQaSession({
  expectedBaseUrl = null,
  requireCredentials = true,
  liveVerify = true,
  staleBufferSeconds = QA_SESSION_STALE_BUFFER_SECONDS,
} = {}) {
  const envReport = getQaSessionEnvReport({
    requireCredentials,
    requireAnonClient: liveVerify,
  });
  if (!envReport.ok) {
    return {
      status: "missing-env",
      summary: summarizeQaSessionStatus("missing-env"),
      reason: `Missing required QA env: ${envReport.missingEnv.join(", ")}.`,
      missingEnv: envReport.missingEnv,
      sessionArtifactPath,
      baseUrl: expectedBaseUrl ?? null,
      email: getOptionalEnv(FITNESS_QA_EMAIL_ENV)?.toLowerCase() ?? null,
      validationMode: liveVerify ? "env-gated" : "artifact-only",
    };
  }

  let artifact;
  try {
    artifact = await readQaSessionArtifact();
  } catch (error) {
    return {
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: `QA session artifact was not found at ${sessionArtifactPath}. Run npm run qa:session.`,
      missingEnv: [],
      sessionArtifactPath,
      baseUrl: expectedBaseUrl ?? null,
      email: getOptionalEnv(FITNESS_QA_EMAIL_ENV)?.toLowerCase() ?? null,
      validationMode: liveVerify ? "env-present-artifact-missing" : "artifact-only",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  const classified = classifyQaSessionArtifact(artifact, {
    expectedEmail: requireCredentials ? getQaCredentials().email : null,
    staleBufferSeconds,
  });
  if (classified.status !== "valid-session") {
    return {
      ...classified,
      missingEnv: [],
      sessionArtifactPath,
      validationMode: "artifact-structure",
      baseUrl: classified.baseUrl ?? expectedBaseUrl ?? null,
    };
  }

  if (!liveVerify) {
    return {
      ...classified,
      missingEnv: [],
      sessionArtifactPath,
      validationMode: "artifact-structure",
      baseUrl: classified.baseUrl ?? expectedBaseUrl ?? null,
    };
  }

  try {
    const anonClient = createAnonClient();
    const { data, error } = await anonClient.auth.getUser(classified.accessToken);
    assertSuccess(error, "Unable to validate the QA session access token");
    const verifiedEmail = typeof data.user?.email === "string" ? data.user.email.toLowerCase() : classified.email;
    if (classified.email && verifiedEmail && classified.email !== verifiedEmail) {
      return {
        ...classified,
        status: "invalid-session",
        summary: summarizeQaSessionStatus("invalid-session"),
        reason: `QA session artifact email ${classified.email} does not match the authenticated user ${verifiedEmail}.`,
        missingEnv: [],
        sessionArtifactPath,
        validationMode: "access-token-verified",
      };
    }

    return {
      ...classified,
      email: verifiedEmail ?? classified.email,
      userId: typeof data.user?.id === "string" ? data.user.id : classified.userId,
      missingEnv: [],
      sessionArtifactPath,
      validationMode: "access-token-verified",
      baseUrl: classified.baseUrl ?? expectedBaseUrl ?? null,
    };
  } catch (error) {
    return {
      ...classified,
      status: "invalid-session",
      summary: summarizeQaSessionStatus("invalid-session"),
      reason: error instanceof Error ? error.message : String(error),
      missingEnv: [],
      sessionArtifactPath,
      validationMode: "access-token-verified",
      baseUrl: classified.baseUrl ?? expectedBaseUrl ?? null,
    };
  }
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
      "Usage: node scripts/qa/fitness-qa-user.mjs <ensure|reset|session|check|cleanup>",
      "",
      `Preferred source for local env: ${envPath}.`,
      `qa:session / qa:session:refresh require ${FITNESS_QA_EMAIL_ENV}, ${FITNESS_QA_PASSWORD_ENV}, ${NEXT_PUBLIC_SUPABASE_URL_ENV}, and ${NEXT_PUBLIC_SUPABASE_ANON_KEY_ENV}.`,
      `${SUPABASE_SERVICE_ROLE_KEY_ENV} is optional for qa:session and required for ensure/reset.`,
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
      command: flags.refresh === true ? "session:refresh" : command,
      status: "valid-session",
      summary: summarizeQaSessionStatus("valid-session"),
      email: result.email,
      userId: result.userId,
      baseUrl: result.baseUrl,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
      expiresAtEpochSeconds: result.expiresAtEpochSeconds,
      sessionArtifactPath,
      latestSessionDetailPath: `/history/${result.latestSessionId}`,
    });
    return;
  }

  if (command === "check") {
    const baseUrl = typeof flags["base-url"] === "string" && flags["base-url"].trim().length > 0
      ? String(flags["base-url"]).trim().replace(/\/$/, "")
      : resolveBaseUrl();
    const result = await inspectQaSession({
      expectedBaseUrl: baseUrl,
      liveVerify: flags["artifact-only"] !== true,
    });
    printResult({
      command: "session-check",
      status: result.status,
      summary: result.summary,
      reason: result.reason ?? null,
      missingEnv: result.missingEnv ?? [],
      validationMode: result.validationMode,
      sessionArtifactPath,
      email: result.email ?? null,
      userId: result.userId ?? null,
      baseUrl: result.baseUrl ?? baseUrl,
      createdAt: result.createdAt ?? null,
      expiresAt: result.expiresAt ?? null,
      expiresAtEpochSeconds: result.expiresAtEpochSeconds ?? null,
      secondsRemaining: result.secondsRemaining ?? null,
    });
    if (result.status !== "valid-session") {
      process.exitCode = 1;
    }
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
