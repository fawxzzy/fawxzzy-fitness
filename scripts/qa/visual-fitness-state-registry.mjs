#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VISUAL_STATE_REGISTRY_VERSION = "fitness-visual-state-registry.v1";
export const ACCEPTED_VISUAL_CATALOG_COUNTS = Object.freeze({
  semanticStates: 111,
  rawCaptures: 313,
});

export const VISUAL_CAPTURE_ENVIRONMENT = Object.freeze({
  browser: "chromium-or-edge",
  colorScheme: "dark",
  deviceScaleFactor: 1,
  locale: "en-US",
  reducedMotion: "reduce",
  timezoneId: "America/New_York",
  animations: "disabled-by-capture-style",
  fontPolicy: "repository-and-browser-pinned-fonts-only",
  baselinePlatform: "windows",
});

const MOBILE_VIEWPORTS = Object.freeze([
  Object.freeze({ id: "mobile-375", width: 375, height: 932 }),
  Object.freeze({ id: "mobile-393", width: 393, height: 932 }),
  Object.freeze({ id: "mobile-430", width: 430, height: 932 }),
]);
const CATALOG_MOBILE_VIEWPORT = Object.freeze({ id: "mobile", width: 390, height: 932 });
const CATALOG_DESKTOP_VIEWPORT = Object.freeze({ id: "desktop", width: 1440, height: 1000 });

const mobileRegressionInventory = [
  ["today-default", "Exercise cards", "today", "default"],
  ["today-detailed", "Exercise cards", "today", "detailed"],
  ["today-progression-status", "Exercise cards", "today", "progression-status"],
  ["today-progression-linked", "Exercise cards", "today", "progression-linked"],
  ["today-rest", "Exercise cards", "today", "rest"],
  ["today-empty", "Exercise cards", "today", "empty"],
  ["today-in-session-summary", "Exercise cards", "today", "in-session-summary"],
  ["active-workout-session", "Session / logging", "session", "active"],
  ["active-workout-session-expanded", "Session / logging", "session", "expanded"],
  ["session-logger-combo-board", "Session / logging", "session", "logger-combo-board-1"],
  ["session-logger-combo-board-2", "Session / logging", "session", "logger-combo-board-2"],
  ["session-logger-combo-board-3", "Session / logging", "session", "logger-combo-board-3"],
  ["session-logger-combo-board-4", "Session / logging", "session", "logger-combo-board-4"],
  ["session-logger-strength-weight", "Session / logging", "session", "logger-strength-weight"],
  ["session-logger-bodyweight-reps", "Session / logging", "session", "logger-bodyweight-reps"],
  ["session-post-close-feedback", "Session / logging", "session", "post-close-feedback"],
  ["session-auto-progression-confirmation", "Session / logging", "session", "auto-progression-confirmation"],
  ["session-logger-cardio-time", "Session / logging", "session", "logger-cardio-time"],
  ["session-logger-cardio-time-distance", "Session / logging", "session", "logger-cardio-time-distance"],
  ["session-logger-cardio-distance", "Session / logging", "session", "logger-cardio-distance"],
  ["session-logger-calories", "Session / logging", "session", "logger-calories"],
  ["routines-current-view", "Exercise cards", "routines", "current-view"],
  ["routines-current-add-day-duplicate", "Exercise cards", "routines", "current-add-day-duplicate"],
  ["routines-list-view", "Exercise cards", "routines", "list-view"],
  ["routines-list-create-duplicate", "Exercise cards", "routines", "list-create-duplicate"],
  ["view-day", "Exercise cards", "view-day", "default"],
  ["view-day-rest", "Exercise cards", "view-day", "rest"],
  ["view-day-empty", "Exercise cards", "view-day", "empty"],
  ["edit-day-default", "Exercise cards", "edit-day", "default"],
  ["edit-day-reorder", "Exercise cards", "edit-day", "reorder"],
  ["edit-day-empty", "Exercise cards", "edit-day", "empty"],
  ["edit-day-edit-exercise", "Exercise cards", "edit-day", "edit-exercise"],
  ["edit-day-add-exercise", "Exercise cards", "edit-day", "add-exercise"],
  ["edit-day-card-parity", "Exercise cards", "edit-day", "card-parity"],
  ["create-routine", "Exercise cards", "create-routine", "default"],
  ["edit-routine", "Exercise cards", "edit-routine", "default"],
  ["add-exercise-default", "Exercise cards", "add-exercise", "default"],
  ["add-exercise-custom-taxonomy", "Exercise cards", "add-exercise", "custom-taxonomy"],
  ["history-sessions-compact", "Session summaries", "history-sessions", "compact"],
  ["history-sessions-detailed", "Session summaries", "history-sessions", "detailed"],
  ["history-progression-default", "Session summaries", "history-progression", "default"],
  ["history-progression-filtered", "Session summaries", "history-progression", "filtered"],
  ["history-exercises-zero-results", "Exercise cards", "history-exercises", "zero-results"],
  ["history-exercises-compact", "Exercise cards", "history-exercises", "compact"],
  ["history-exercises-detailed", "Exercise cards", "history-exercises", "detailed"],
  ["history-exercises-media-fallback", "Exercise cards", "history-exercises", "media-fallback"],
  ["history-exercises-cardio-taxonomy", "Exercise cards", "history-exercises", "cardio-taxonomy"],
  ["history-detail-broken-images", "Session summaries", "history-detail", "broken-images"],
  ["history-detail-progression-expanded", "Session summaries", "history-detail", "progression-expanded"],
  ["history-detail-feedback-note", "Session summaries", "history-detail", "feedback-note"],
  ["history-detail-long-metrics", "Session summaries", "history-detail", "long-metrics"],
  ["settings-default", "Settings / detail", "settings", "default"],
  ["settings-data-export", "Settings / detail", "settings", "data-export"],
  ["settings-achievements", "Settings / detail", "settings", "achievements"],
  ["exercise-detail-strength", "Settings / detail", "exercise-detail", "strength"],
  ["exercise-detail-cardio", "Settings / detail", "exercise-detail", "cardio"],
  ["exercise-detail-bodyweight", "Settings / detail", "exercise-detail", "bodyweight"],
  ["exercise-detail-weighted-strength", "Settings / detail", "exercise-detail", "weighted-strength"],
  ["exercise-detail-weighted-strength-long-target", "Settings / detail", "exercise-detail", "weighted-strength-long-target"],
  ["exercise-detail-long-scroll", "Settings / detail", "exercise-detail", "long-scroll"],
];

const publicRouteInventory = [
  ["root", "/", { kind: "one-of", values: ["/", "/entry", "/login?manual=1"] }, "Fawxzzy"],
  ["entry", "/entry", { kind: "one-of", values: ["/entry", "/login?manual=1"] }, "Fawxzzy"],
  ["login", "/login?manual=1", { kind: "exact", value: "/login?manual=1" }, "Welcome"],
  ["signup", "/signup", { kind: "exact", value: "/signup" }, "Create"],
  ["forgot-password", "/forgot-password", { kind: "exact", value: "/login?manual=1" }, "password"],
  ["reset-password", "/reset-password", { kind: "exact", value: "/reset-password" }, "password"],
  ["install", "/install", { kind: "exact", value: "/install" }, "Install"],
  ["privacy", "/privacy", { kind: "exact", value: "/privacy" }, "Privacy"],
  ["terms", "/terms", { kind: "exact", value: "/terms" }, "Terms"],
];

const authLabInventory = [
  ["login", "Welcome"],
  ["login-remembered", "Welcome"],
  ["login-remembered-password", "Password"],
  ["login-remembered-reauth", "Password"],
  ["signup", "Create"],
  ["reset-password-linking", "Finishing your password reset link"],
  ["loading-boot", "Opening FawxzzyFitness"],
  ["loading-route", "Loading"],
  ["entry-handoff", "Checking where to drop you in"],
  ["entry-handoff-error", "Could not open app"],
  ["curated-restore-loading", "Restoring your training setup"],
];

const onboardingInventory = [
  ["empty-intro", "intro", "Custom Workout Setup Intake", "empty"],
  ["empty-goals", "goals", "Main Goal", "empty"],
  ["empty-experience", "experience", "Body + Training Background", "empty"],
  ["empty-schedule", "schedule", "Schedule + Lifestyle", "empty"],
  ["empty-equipment", "equipment", "Equipment Access", "empty"],
  ["empty-constraints", "constraints", "Complications / Injuries / Things To Plan Around", "empty"],
  ["empty-preferences", "preferences", "Exercise Preferences", "empty"],
  ["empty-nutrition", "nutrition", "Nutrition Basics", "empty"],
  ["empty-delivery", "delivery", "Accountability + Delivery", "empty"],
  ["empty-review", "review", "Review", "empty"],
  ["complete-intro", "intro", "Custom Workout Setup Intake", "complete"],
  ["complete-goals", "goals", "Main Goal", "complete"],
  ["complete-experience", "experience", "Body + Training Background", "complete"],
  ["complete-schedule", "schedule", "Schedule + Lifestyle", "complete"],
  ["complete-equipment", "equipment", "Equipment Access", "complete"],
  ["complete-constraints", "constraints", "Complications / Injuries / Things To Plan Around", "complete"],
  ["complete-preferences", "preferences", "Exercise Preferences", "complete"],
  ["complete-nutrition", "nutrition", "Nutrition Basics", "complete"],
  ["complete-delivery", "delivery", "Accountability + Delivery", "complete"],
  ["complete-review", "review", "Review", "complete"],
  ["conditional-under18", "intro", "parent/guardian permission", "conditional-under18"],
  ["conditional-tracking-tool", "experience", "What do you use to track?", "conditional-tracking-tool"],
  ["conditional-dumbbell-weight", "equipment", "dumbbells", "conditional-dumbbell-weight"],
  ["conditional-full-safety", "constraints", "What were you told to avoid?", "conditional-full-safety"],
  ["other-main-goal", "goals", "Other", "other-main-goal"],
  ["other-schedule", "schedule", "Other", "other-schedule"],
  ["other-equipment", "equipment", "Other", "other-equipment"],
  ["review-partial", "review", "Incomplete", "review-partial"],
  ["safety-ack-incomplete", "constraints", "Safety", "safety-ack-incomplete"],
  ["delivery-acks-incomplete", "delivery", "Incomplete", "delivery-acks-incomplete"],
  ["generation-handoff", "generation-handoff", "Building", "generation-handoff"],
];

const COMPLETE_CURATED_RESPONSES = Object.freeze({
  email: "curated-standard@example.invalid",
  name: "Atlas Standard",
  contactMethod: "N/A",
  socialUsername: "N/A",
  under18: "no",
  mainGoals: ["build-muscle"],
  primaryGoal: "Build a sustainable strength routine",
  topThreeGoals: "Strength, consistency, mobility",
  areasToImprove: ["chest"],
  biggestStruggles: ["exercise-selection"],
  height: "5 ft 10 in",
  currentWeight: "180 lbs",
  weightDirection: "gain",
  trainingExperience: "brand-new",
  currentRoutine: "Three simple full-body sessions",
  tracksWorkouts: "yes",
  trainingDaysPerWeek: "1",
  workoutLength: "20-30",
  preferredTrainingDays: ["mon"],
  trainingTime: "morning",
  outsideActivity: "mostly-sitting",
  sleepHours: "under-5",
  trainingLocations: ["commercial-gym"],
  availableEquipment: ["dumbbells"],
  hasPainOrLimitations: "no",
  professionalRestrictions: "no",
  warningSymptoms: ["none"],
  medications: "no",
  safetyAcknowledgment: true,
  exerciseEnjoy: "Squats and rows",
  movementsToImprove: ["push-ups"],
  planStyle: "simple-repeatable",
  equipmentPreference: "machines",
  tracksFood: "yes",
  tracksProtein: "yes",
  eatingPattern: "clean",
  nutritionDirection: "bulk",
  nutritionHelp: ["protein"],
  planContents: ["weekly-split"],
  planDetail: "simple",
  deliveryMethod: "google-doc",
  followUpConsent: "yes",
  testimonialConsent: "yes",
  accuracyAcknowledgment: true,
  fitnessGuidanceAcknowledgment: true,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCuratedResponses(fixtureId) {
  if (fixtureId === "empty") {
    return {};
  }

  const responses = clone(COMPLETE_CURATED_RESPONSES);
  if (fixtureId === "conditional-under18") {
    responses.under18 = "yes";
    responses.guardianPermission = "yes";
  } else if (fixtureId === "conditional-tracking-tool") {
    responses.tracksWorkouts = "sometimes";
    responses.trackingTool = "Spreadsheet";
  } else if (fixtureId === "conditional-dumbbell-weight") {
    responses.availableEquipment = ["dumbbells"];
    responses.heaviestDumbbells = "50 lbs";
  } else if (fixtureId === "conditional-full-safety") {
    responses.hasPainOrLimitations = "yes";
    responses.painDetails = "Avoid painful overhead range";
    responses.professionalRestrictions = "yes";
    responses.restrictedMovements = "Avoid overhead movements";
  } else if (fixtureId === "other-main-goal") {
    responses.mainGoals = ["other"];
    responses.mainGoalsOther = "Improve climbing endurance";
  } else if (fixtureId === "other-schedule") {
    responses.trainingDaysPerWeek = "other";
    responses.trainingDaysPerWeekOther = "3";
    responses.workoutLength = "other";
    responses.workoutLengthOther = "45";
  } else if (fixtureId === "other-equipment") {
    responses.trainingLocations = ["other"];
    responses.trainingLocationsOther = "Home";
    responses.availableEquipment = ["other"];
    responses.availableEquipmentOther = "TRX suspension trainer and resistance bands";
  } else if (fixtureId === "review-partial") {
    responses.primaryGoal = "";
  } else if (fixtureId === "safety-ack-incomplete") {
    responses.safetyAcknowledgment = false;
  } else if (fixtureId === "delivery-acks-incomplete") {
    responses.accuracyAcknowledgment = false;
    responses.fitnessGuidanceAcknowledgment = false;
  }
  return responses;
}

function buildCuratedStorageState(stepId, fixtureId) {
  const intakeResponses = buildCuratedResponses(fixtureId);
  const complete = fixtureId !== "empty";
  const generation = fixtureId === "generation-handoff";
  return {
    version: 3,
    draft: {
      version: 3,
      draftId: "curated-primary",
      stepId,
      updatedAt: "2026-07-27T00:00:00.000Z",
      data: {
        intakeResponses,
        trainingGoal: complete ? "build-muscle" : null,
        experience: complete ? "beginner" : null,
        daysPerWeek: complete ? 1 : null,
        sessionLengthMinutes: complete ? 30 : null,
        equipment: complete ? ["full-gym", "dumbbells"] : [],
        preferredStyle: complete ? "full-body" : null,
        cardioPreference: complete ? "balanced" : null,
        limitations: "",
        exerciseLikes: complete ? ["Squats", "Rows"] : [],
        exerciseDislikes: [],
        targetAreas: complete ? ["chest"] : [],
      },
    },
    lifecycle: {
      intakeStatus: generation ? "completed" : "draft",
      generationStatus: generation ? "queued" : "idle",
      planId: null,
      completedAt: generation ? "2026-07-27T00:00:00.000Z" : null,
    },
    message: null,
  };
}

function makeState(overrides) {
  return Object.freeze({
    proofLane: "fixture",
    authState: "anonymous",
    setupRequirements: [],
    interaction: null,
    baselineEligible: true,
    captureLane: "full",
    sensitiveOutputPolicy: "sanitized-metadata-only",
    captureModes: ["viewport"],
    ...overrides,
  });
}

const MOBILE_REGRESSION_SELECTED_EXERCISES = Object.freeze({
  "active-workout-session-expanded": "session-ex-2",
  "session-logger-strength-weight": "session-ex-1",
  "session-logger-bodyweight-reps": "session-ex-4",
  "session-post-close-feedback": "session-ex-4",
  "session-logger-cardio-time": "session-ex-5",
  "session-logger-cardio-time-distance": "session-ex-3",
  "session-logger-cardio-distance": "session-ex-6",
  "session-logger-calories": "session-ex-7",
  "add-exercise-default": "11111111-1111-4111-8111-111111111111",
});

function buildMobileRegressionExpectedRoute(id) {
  const route = `/dev/mobile-regression?scenario=${encodeURIComponent(id)}`;
  const exerciseId = MOBILE_REGRESSION_SELECTED_EXERCISES[id];
  return {
    kind: "exact",
    value: exerciseId ? `${route}&exerciseId=${encodeURIComponent(exerciseId)}` : route,
  };
}

const signedInStates = mobileRegressionInventory.map(([id, family, screen, fixture], index) =>
  makeState({
    id: `signed-in:${id}`,
    family,
    requestedRoute: `/dev/mobile-regression?scenario=${encodeURIComponent(id)}`,
    expectedResolvedRoute: buildMobileRegressionExpectedRoute(id),
    authState: "synthetic-signed-in-fixture",
    fixtureOwner: `mobile-regression:${id}`,
    setupRequirements: ["deterministic-dev-mobile-regression-fixture"],
    viewports: MOBILE_VIEWPORTS,
    assertions: [{ kind: "selector", value: `[data-mobile-regression-id="${id}"]` }],
    expectedOutput: `public-${id}-{viewport}.png`,
    captureLane: index === 0 ? "smoke" : "full",
    notes: `screen=${screen}; fixture=${fixture}`,
  }),
);

const publicStates = publicRouteInventory.map(([id, route, expectedResolvedRoute, expectedText]) =>
  makeState({
    id: `public:${id}`,
    family: "Public, legal, and install",
    requestedRoute: route,
    expectedResolvedRoute,
    fixtureOwner: `public-route:${id}`,
    setupRequirements: ["ephemeral-anonymous-browser-context"],
    viewports: [CATALOG_MOBILE_VIEWPORT, CATALOG_DESKTOP_VIEWPORT],
    assertions: [{ kind: "text", value: expectedText }],
    expectedOutput: `auth-${id}-{viewport}.png`,
    captureLane: id === "privacy" ? "smoke" : "full",
  }),
);

const authStates = authLabInventory.map(([id, expectedText]) =>
  makeState({
    id: `auth:${id}`,
    family: "Auth, loading, restore, and handoff",
    requestedRoute: `/dev/auth-screen-lab?screen=${encodeURIComponent(id)}`,
    expectedResolvedRoute: {
      kind: "exact",
      value: `/dev/auth-screen-lab?screen=${encodeURIComponent(id)}`,
    },
    fixtureOwner: `auth-screen-lab:${id}`,
    setupRequirements: ["deterministic-dev-auth-screen-lab"],
    viewports: [CATALOG_MOBILE_VIEWPORT, CATALOG_DESKTOP_VIEWPORT],
    assertions: [{ kind: "text", value: expectedText }],
    expectedOutput: `${id}-{viewport}.png`,
    captureLane: id === "loading-boot" ? "smoke" : "full",
  }),
);

const onboardingStates = onboardingInventory.map(([id, stepId, expectedText, fixtureId]) =>
  makeState({
    id: `onboarding:${id}`,
    family: "Curated onboarding",
    requestedRoute: "/dev/curated-onboarding",
    expectedResolvedRoute: { kind: "exact", value: "/dev/curated-onboarding" },
    fixtureOwner: `curated-onboarding:${fixtureId}`,
    setupRequirements: ["deterministic-local-storage-state", "preview-only-generation"],
    setup: {
      kind: "local-storage",
      key: "fawxzzy:curated-onboarding:v1:mobile-regression-curated-onboarding:state",
      value: buildCuratedStorageState(stepId, fixtureId),
    },
    viewports: [CATALOG_MOBILE_VIEWPORT, CATALOG_DESKTOP_VIEWPORT],
    captureModes: ["viewport", "mobile-bottom"],
    assertions: [{ kind: "text", value: expectedText }],
    expectedOutput: `onboarding-${id}-{viewport}{captureModeSuffix}.png`,
    captureLane: id === "empty-intro" ? "smoke" : "full",
    notes: `step=${stepId}; fixture=${fixtureId}`,
  }),
);

export const VISUAL_FITNESS_STATE_REGISTRY = Object.freeze([
  ...signedInStates,
  ...publicStates,
  ...authStates,
  ...onboardingStates,
]);

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeVisualStateRegistryDigest(registry = VISUAL_FITNESS_STATE_REGISTRY) {
  return crypto.createHash("sha256").update(stableSerialize(registry), "utf8").digest("hex");
}

export function validateVisualStateRegistry(registry = VISUAL_FITNESS_STATE_REGISTRY) {
  const errors = [];
  const ids = new Set();
  const outputKeys = new Set();
  const requiredKeys = [
    "id",
    "family",
    "requestedRoute",
    "expectedResolvedRoute",
    "authState",
    "fixtureOwner",
    "viewports",
    "captureModes",
    "assertions",
    "expectedOutput",
    "captureLane",
  ];

  registry.forEach((state, index) => {
    const missing = requiredKeys.filter((key) => {
      const value = state?.[key];
      return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    });
    if (missing.length > 0) {
      errors.push(`State at index ${index} is missing: ${missing.join(", ")}.`);
    }
    if (ids.has(state.id)) {
      errors.push(`Duplicate state id: ${state.id}.`);
    }
    ids.add(state.id);
    for (const plan of expandVisualCapturePlans([state])) {
      if (outputKeys.has(plan.outputFilename)) {
        errors.push(`Duplicate output filename: ${plan.outputFilename}.`);
      }
      outputKeys.add(plan.outputFilename);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    stateCount: registry.length,
    captureCount: expandVisualCapturePlans(registry).length,
    familyCount: new Set(registry.map((state) => state.family)).size,
  };
}

function renderOutputFilename(template, { viewport, captureMode }) {
  const suffix = captureMode === "mobile-bottom" ? "-bottom" : "";
  return template
    .replace("{viewport}", viewport.id)
    .replace("{captureModeSuffix}", suffix);
}

export function expandVisualCapturePlans(
  registry = VISUAL_FITNESS_STATE_REGISTRY,
  { tier = "full" } = {},
) {
  const states = tier === "smoke"
    ? registry.filter((state) => state.captureLane === "smoke")
    : registry;
  const plans = [];

  for (const [registryIndex, state] of states.entries()) {
    for (const viewport of state.viewports) {
      const modes = state.captureModes.filter((captureMode) => {
        if (captureMode === "mobile-bottom") {
          return viewport.id === "mobile";
        }
        return captureMode === "viewport";
      });
      for (const [variantIndex, captureMode] of modes.entries()) {
        const outputFilename = renderOutputFilename(state.expectedOutput, {
          viewport,
          captureMode,
        });
        plans.push({
          captureId: `${state.id}:${viewport.id}:${captureMode}`,
          registryIndex,
          variantIndex,
          state,
          viewport,
          captureMode,
          outputFilename,
        });
      }
    }
  }

  return plans;
}

export function buildVisualCatalogCoverage(registry = VISUAL_FITNESS_STATE_REGISTRY) {
  const plans = expandVisualCapturePlans(registry);
  const familyCounts = {};
  for (const state of registry) {
    familyCounts[state.family] ??= { semanticStates: 0, rawCaptures: 0 };
    familyCounts[state.family].semanticStates += 1;
  }
  for (const plan of plans) {
    familyCounts[plan.state.family].rawCaptures += 1;
  }
  return {
    registryVersion: VISUAL_STATE_REGISTRY_VERSION,
    registryDigest: computeVisualStateRegistryDigest(registry),
    semanticStates: registry.length,
    rawCaptures: plans.length,
    families: Object.fromEntries(Object.entries(familyCounts).sort(([left], [right]) => left.localeCompare(right))),
    missingStates: [],
    skippedStates: [],
  };
}

export function buildVisualCatalogCountDelta(
  coverage = buildVisualCatalogCoverage(),
  accepted = ACCEPTED_VISUAL_CATALOG_COUNTS,
) {
  const stateDelta = coverage.semanticStates - accepted.semanticStates;
  const captureDelta = coverage.rawCaptures - accepted.rawCaptures;
  return {
    accepted,
    current: {
      semanticStates: coverage.semanticStates,
      rawCaptures: coverage.rawCaptures,
    },
    delta: {
      semanticStates: stateDelta,
      rawCaptures: captureDelta,
    },
    reconciled: stateDelta === 0 && captureDelta === 0,
    explanations: stateDelta === 0 && captureDelta === 0
      ? ["Registry exactly reproduces the accepted semantic-state and raw-capture denominators."]
      : [],
  };
}

export function listVisualFitnessStates({ family = null, tier = "full" } = {}) {
  return VISUAL_FITNESS_STATE_REGISTRY.filter((state) => {
    if (tier === "smoke" && state.captureLane !== "smoke") {
      return false;
    }
    return !family || state.family === family;
  });
}

export function getVisualFitnessState(id) {
  return VISUAL_FITNESS_STATE_REGISTRY.find((state) => state.id === id) ?? null;
}

function main() {
  const validation = validateVisualStateRegistry();
  const coverage = buildVisualCatalogCoverage();
  const countDelta = buildVisualCatalogCountDelta(coverage);
  process.stdout.write(`${JSON.stringify({
    validation,
    coverage,
    countDelta,
    environment: VISUAL_CAPTURE_ENVIRONMENT,
  }, null, 2)}\n`);
  if (!validation.valid || !countDelta.reconciled) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
