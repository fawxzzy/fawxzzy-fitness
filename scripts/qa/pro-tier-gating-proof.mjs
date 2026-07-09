#!/usr/bin/env node
import crypto from "node:crypto";
import {
  createAnonClient,
  createServiceRoleClient,
  getQaCredentials,
  resolveBaseUrl,
} from "./fitness-qa-config.mjs";

const TIER_QA_EMAIL = "atlas-fitness-tier-qa@fawxzzy.test";
const TIER_QA_DISPLAY_NAME = "Fitness Tier QA User";
const BASE_ROUTINE_LIMIT = 3;
const BASE_SAVED_WORKOUT_PLAN_LIMIT = 14;
const leaveAccountFree = process.argv.includes("--leave-free");

function assertSuccess(error, message) {
  if (!error) {
    return;
  }

  throw new Error(`${message}: ${error.message ?? "Unknown Supabase error"}`);
}

function isMissingRelation(error) {
  return error?.code === "42P01";
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

async function ensureTierQaUser(adminClient) {
  const password = getQaCredentials().password;
  const users = await listAllUsers(adminClient);
  const existing = users.find((user) => String(user.email ?? "").toLowerCase() === TIER_QA_EMAIL);
  const attributes = {
    email: TIER_QA_EMAIL,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: TIER_QA_DISPLAY_NAME,
      atlas_qa_label: "Fitness Pro Tier Gating QA User",
    },
    app_metadata: {
      atlas_qa_user: true,
      atlas_qa_scope: "fitness-pro-tier-gating",
    },
  };

  if (!existing) {
    const { data, error } = await adminClient.auth.admin.createUser(attributes);
    assertSuccess(error, `Unable to create ${TIER_QA_EMAIL}`);
    if (!data.user) {
      throw new Error(`Supabase did not return the created tier QA user for ${TIER_QA_EMAIL}.`);
    }
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, attributes);
  assertSuccess(error, `Unable to synchronize ${TIER_QA_EMAIL}`);
  if (!data.user) {
    throw new Error(`Supabase did not return the synchronized tier QA user for ${TIER_QA_EMAIL}.`);
  }
  return data.user;
}

async function deleteUserRows(client, userId) {
  const deleteTables = [
    "sets",
    "session_exercises",
    "sessions",
    "routine_day_exercises",
    "routine_days",
    "routines",
    "workout_plan_template_exercises",
    "workout_plan_templates",
    "user_entitlements",
    "billing_purchases",
    "billing_customers",
  ];

  for (const table of deleteTables) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error && !isMissingRelation(error)) {
      throw new Error(`Unable to reset ${table} for ${TIER_QA_EMAIL}: ${error.message ?? "Unknown Supabase error"}`);
    }
  }

  const { error: profileError } = await client.from("profiles").delete().eq("id", userId);
  if (profileError && !isMissingRelation(profileError)) {
    throw new Error(`Unable to reset profile for ${TIER_QA_EMAIL}: ${profileError.message ?? "Unknown Supabase error"}`);
  }
}

async function loadSeedExerciseId(client) {
  const { data, error } = await client
    .from("exercises")
    .select("id")
    .is("user_id", null)
    .eq("name", "Back Squat")
    .maybeSingle();
  assertSuccess(error, "Unable to load global Back Squat for tier QA workout plans");
  if (!data?.id) {
    throw new Error("Tier QA cannot continue because global Back Squat is missing.");
  }
  return data.id;
}

function buildIso(offsetDays, hour = 12) {
  const date = new Date(Date.UTC(2026, 6, 1 + offsetDays, hour, 0, 0));
  return date.toISOString();
}

function buildSeedRows(userId, exerciseId) {
  const routineIds = Array.from({ length: BASE_ROUTINE_LIMIT + 2 }, () => crypto.randomUUID());
  const routineDayIds = routineIds.map(() => crypto.randomUUID());
  const templateIds = Array.from({ length: BASE_SAVED_WORKOUT_PLAN_LIMIT + 2 }, () => crypto.randomUUID());
  const activeRoutineId = routineIds[0];

  const routines = routineIds.map((id, index) => ({
    id,
    user_id: userId,
    name: `Tier QA Routine ${index + 1}`,
    cycle_length_days: 1,
    start_date: "2026-07-01",
    timezone: "America/New_York",
    weight_unit: "lbs",
    created_at: buildIso(index),
    updated_at: index === 0 ? buildIso(-30) : buildIso(index),
  }));

  const routineDays = routineIds.map((routineId, index) => ({
    id: routineDayIds[index],
    user_id: userId,
    routine_id: routineId,
    day_index: 1,
    name: `Tier QA Day ${index + 1}`,
    is_rest: false,
    notes: "Pro tier gating QA fixture.",
  }));
  const routineDayExercises = routineDayIds.map((routineDayId, index) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    position: 0,
    target_sets: 3,
    target_reps_min: 5,
    target_reps_max: 5,
    target_weight: 225 + index,
    target_weight_unit: "lbs",
    measurement_type: "reps",
    default_unit: "reps",
    notes: "Pro tier gating routine-day exercise fixture.",
  }));

  const templates = templateIds.map((id, index) => ({
    id,
    user_id: userId,
    name: `Tier QA Plan ${String(index + 1).padStart(2, "0")}`,
    source_routine_day_id: null,
    is_rest: false,
    created_at: buildIso(index),
    updated_at: buildIso(index),
  }));

  const templateExercises = templateIds.map((templateId, index) => ({
    id: crypto.randomUUID(),
    workout_plan_template_id: templateId,
    user_id: userId,
    exercise_id: exerciseId,
    position: 0,
    target_sets: 3,
    target_reps_min: 5,
    target_reps_max: 5,
    target_weight: 225 + index,
    target_weight_unit: "lbs",
    measurement_type: "reps",
    default_unit: "reps",
    notes: "Pro tier gating saved workout plan fixture.",
    created_at: buildIso(index),
    updated_at: buildIso(index),
  }));

  return {
    activeRoutineId,
    routineDayIds,
    routines,
    routineDays,
    routineDayExercises,
    templates,
    templateExercises,
    expectedFreeRoutineIds: new Set([routineIds[0], routineIds[4], routineIds[3]]),
    expectedHiddenRoutineIds: new Set([routineIds[1], routineIds[2]]),
    expectedFreeTemplateIds: new Set(templateIds.slice(2)),
    expectedHiddenTemplateIds: new Set(templateIds.slice(0, 2)),
  };
}

async function seedTierQaData(client, userId) {
  await deleteUserRows(client, userId);
  const exerciseId = await loadSeedExerciseId(client);
  const seed = buildSeedRows(userId, exerciseId);

  assertSuccess((await client.from("profiles").insert({
    id: userId,
    timezone: "America/New_York",
    active_routine_id: seed.activeRoutineId,
    preferred_weight_unit: "lbs",
    preferred_distance_unit: "mi",
  })).error, "Unable to seed tier QA profile");
  assertSuccess((await client.from("routines").insert(seed.routines)).error, "Unable to seed tier QA routines");
  assertSuccess((await client.from("routine_days").insert(seed.routineDays)).error, "Unable to seed tier QA routine days");
  assertSuccess((await client.from("routine_day_exercises").insert(seed.routineDayExercises)).error, "Unable to seed tier QA routine day exercises");
  assertSuccess((await client.from("workout_plan_templates").insert(seed.templates)).error, "Unable to seed tier QA workout plans");
  assertSuccess((await client.from("workout_plan_template_exercises").insert(seed.templateExercises)).error, "Unable to seed tier QA workout plan exercises");

  return seed;
}

async function signInTierQaUser() {
  const anonClient = createAnonClient();
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: TIER_QA_EMAIL,
    password: getQaCredentials().password,
  });
  assertSuccess(error, `Unable to sign in ${TIER_QA_EMAIL}`);
  if (!data.session || !data.user) {
    throw new Error(`Supabase did not return a session for ${TIER_QA_EMAIL}.`);
  }

  return data.session;
}

async function fetchApp(path, session) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    headers: {
      "x-atlas-access-token": session.access_token,
      "x-atlas-refresh-token": session.refresh_token,
      "cookie": `sb-access-token=${encodeURIComponent(session.access_token)}; sb-refresh-token=${encodeURIComponent(session.refresh_token)}`,
    },
  });
  const text = await response.text();
  return {
    path,
    status: response.status,
    text,
  };
}

function bodyIncludesAll(body, names) {
  return names.every((name) => body.includes(name));
}

function bodyIncludesNone(body, names) {
  return names.every((name) => !body.includes(name));
}

async function grantPro(client, userId) {
  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();
  assertSuccess((await client.from("billing_purchases").insert({
    id: purchaseId,
    user_id: userId,
    purchase_kind: "pro_subscription",
    status: "completed",
    stripe_checkout_session_id: `cs_test_tier_qa_${Date.now()}`,
    stripe_customer_id: `cus_tier_qa_${Date.now()}`,
    stripe_price_id: "price_tier_qa_monthly",
    stripe_subscription_id: `sub_tier_qa_${Date.now()}`,
    amount_total: 500,
    currency: "usd",
    billing_interval: "month",
    billing_interval_count: 1,
    period_start: now,
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: now,
    raw_event_id: `evt_tier_qa_${Date.now()}`,
  })).error, "Unable to seed tier QA Pro purchase");

  assertSuccess((await client.from("user_entitlements").upsert({
    user_id: userId,
    entitlement_key: "pro",
    status: "active",
    granted_at: now,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    granted_via_purchase_id: purchaseId,
    source_subscription_id: `sub_tier_qa_${Date.now()}`,
  }, {
    onConflict: "user_id,entitlement_key",
  })).error, "Unable to seed tier QA Pro entitlement");
}

function assertRouteProof(label, condition, details) {
  if (!condition) {
    throw new Error(`${label} failed: ${details}`);
  }
}

function isNotFoundBody(body) {
  return /not found|404|could not/i.test(body);
}

async function main() {
  const adminClient = createServiceRoleClient();
  const user = await ensureTierQaUser(adminClient);
  const seed = await seedTierQaData(adminClient, user.id);
  const session = await signInTierQaUser();

  const freeRoutines = await fetchApp("/routines", session);
  const freePlans = await fetchApp("/routines/workout-plans", session);
  const hiddenRoutineId = [...seed.expectedHiddenRoutineIds][0];
  const hiddenRoutine = await fetchApp(`/routines/${hiddenRoutineId}`, session);
  const visibleRoutineNames = seed.routines
    .filter((routine) => seed.expectedFreeRoutineIds.has(routine.id))
    .map((routine) => routine.name);
  const hiddenRoutineNames = seed.routines
    .filter((routine) => seed.expectedHiddenRoutineIds.has(routine.id))
    .map((routine) => routine.name);
  const visiblePlanNames = seed.templates
    .filter((template) => seed.expectedFreeTemplateIds.has(template.id))
    .map((template) => template.name);
  const hiddenPlanNames = seed.templates
    .filter((template) => seed.expectedHiddenTemplateIds.has(template.id))
    .map((template) => template.name);

  assertRouteProof("Free routines route", freeRoutines.status === 200, `status ${freeRoutines.status}`);
  assertRouteProof("Free routines visible set", bodyIncludesAll(freeRoutines.text, visibleRoutineNames), visibleRoutineNames.join(", "));
  assertRouteProof("Free routines hidden set", bodyIncludesNone(freeRoutines.text, hiddenRoutineNames), hiddenRoutineNames.join(", "));
  assertRouteProof("Free workout plans route", freePlans.status === 200, `status ${freePlans.status}`);
  assertRouteProof("Free workout plans visible set", bodyIncludesAll(freePlans.text, visiblePlanNames), visiblePlanNames.join(", "));
  assertRouteProof("Free workout plans hidden set", bodyIncludesNone(freePlans.text, hiddenPlanNames), hiddenPlanNames.join(", "));
  assertRouteProof(
    "Free hidden routine direct route",
    !hiddenRoutine.text.includes(hiddenRoutineNames[0]) && isNotFoundBody(hiddenRoutine.text),
    `status ${hiddenRoutine.status}`,
  );

  if (leaveAccountFree) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      mode: "free",
      account: TIER_QA_EMAIL,
      baseUrl: resolveBaseUrl(),
      userId: user.id,
      routes: {
        routines: "/routines",
        workoutPlans: "/routines/workout-plans",
        routineEdit: `/routines/${seed.activeRoutineId}/edit`,
        dayEdit: `/routines/${seed.activeRoutineId}/edit/day/${seed.routineDayIds[0]}`,
      },
      free: {
        routineLimit: BASE_ROUTINE_LIMIT,
        visibleRoutineNames,
        hiddenRoutineNames,
        planLimit: BASE_SAVED_WORKOUT_PLAN_LIMIT,
        visiblePlanCount: visiblePlanNames.length,
        hiddenPlanNames,
        hiddenRoutineDirectStatus: hiddenRoutine.status,
        hiddenRoutineDirectBlocked: true,
      },
    }, null, 2)}\n`);
    return;
  }

  await grantPro(adminClient, user.id);

  const proRoutines = await fetchApp("/routines", session);
  const proPlans = await fetchApp("/routines/workout-plans", session);
  const proHiddenRoutine = await fetchApp(`/routines/${hiddenRoutineId}`, session);

  assertRouteProof("Pro routines route", proRoutines.status === 200, `status ${proRoutines.status}`);
  assertRouteProof("Pro routines all visible", bodyIncludesAll(proRoutines.text, seed.routines.map((routine) => routine.name)), "not all routines rendered");
  assertRouteProof("Pro workout plans route", proPlans.status === 200, `status ${proPlans.status}`);
  assertRouteProof("Pro workout plans all visible", bodyIncludesAll(proPlans.text, seed.templates.map((template) => template.name)), "not all templates rendered");
  assertRouteProof(
    "Pro previously hidden routine direct route",
    proHiddenRoutine.status === 200 && proHiddenRoutine.text.includes(hiddenRoutineNames[0]),
    `status ${proHiddenRoutine.status}`,
  );

  process.stdout.write(`${JSON.stringify({
    ok: true,
    account: TIER_QA_EMAIL,
    baseUrl: resolveBaseUrl(),
    userId: user.id,
    free: {
      routineLimit: BASE_ROUTINE_LIMIT,
      visibleRoutineNames,
      hiddenRoutineNames,
      planLimit: BASE_SAVED_WORKOUT_PLAN_LIMIT,
      visiblePlanCount: visiblePlanNames.length,
      hiddenPlanNames,
      hiddenRoutineDirectStatus: hiddenRoutine.status,
      hiddenRoutineDirectBlocked: true,
    },
    pro: {
      visibleRoutineCount: seed.routines.length,
      visiblePlanCount: seed.templates.length,
      previouslyHiddenRoutineDirectStatus: proHiddenRoutine.status,
      previouslyHiddenRoutineDirectVisible: true,
    },
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
