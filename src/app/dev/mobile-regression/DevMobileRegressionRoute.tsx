import Link from "next/link";
import nextDynamic from "next/dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegressionBodyFlag } from "@/app/dev/mobile-regression/RegressionBodyFlag";
import { RegressionDayRestToggleDockControl } from "@/app/dev/mobile-regression/RegressionDayRestToggleDockControl";
import { AppNav } from "@/components/AppNav";
import { ExerciseChooserRouteScaffold } from "@/components/exercises/ExerciseChooserScreenFamily";
import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomActionDock } from "@/components/layout/BottomActionDock";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { RoutinesRouteHeaderCard } from "@/components/routines/RoutinesScreenFamily";
import { SettingsScreenStateProvider } from "@/components/settings/SettingsScreenState";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppShell } from "@/components/ui/app/AppShell";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { HistoryPageHeader } from "@/components/history/HistoryShared";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { EXERCISE_PICKER_CUSTOM_EXERCISE_ID } from "@/components/ExercisePicker";
import {
  mobileRegressionScenarios,
  resolveMobileRegressionScenario,
  type MobileRouteKey,
  type MobileFixtureScenario,
} from "@/features/mobile-regression/fixtures";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import { buildProgressionHistoryDisplayModel, type ProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import type { ProgressionAnalyticsEvent } from "@/lib/progression-event-analytics";
import {
  applyProgressionHistoryFilters,
  buildProgressionHistoryFilterOptions,
  type ProgressionHistoryFilters,
} from "@/lib/progression-history-filters";
import type { ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import type { ProgressionStatusSurfaceItem } from "@/lib/progression-status-display";
import { formatTodayHeaderTitle } from "@/lib/today-page-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const CARD_HEADER_CLASS_NAME = "-mx-4 -mt-1 pb-1 sm:-mx-5";
const SECTION_TITLE_CLASS_NAME = "text-[1.3125rem] font-semibold leading-[1.04] tracking-[-0.03em]";

const EditDayRegressionSurface = nextDynamic(
  () => import("@/app/dev/mobile-regression/EditDayRegressionSurface").then((mod) => mod.EditDayRegressionSurface),
  { ssr: true },
);
const RegressionExerciseInfoSheet = nextDynamic(
  () => import("@/app/dev/mobile-regression/RegressionExerciseInfoSheet").then((mod) => mod.RegressionExerciseInfoSheet),
  { ssr: true },
);
const MeasurementComboBoard = nextDynamic(
  () => import("@/app/dev/mobile-regression/MeasurementComboBoard").then((mod) => mod.MeasurementComboBoard),
  { ssr: true },
);
const TodayDayPicker = nextDynamic(() => import("@/app/today/TodayDayPicker").then((mod) => mod.TodayDayPicker), { ssr: true });
const TodayExerciseRows = nextDynamic(
  () => import("@/app/today/TodayExerciseRows").then((mod) => mod.TodayExerciseRows),
  { ssr: true },
);
const TodayStartButton = nextDynamic(
  () => import("@/app/today/TodayStartButton").then((mod) => mod.TodayStartButton),
  { ssr: true },
);
const RoutinesPageClient = nextDynamic(
  () => import("@/app/routines/RoutinesPageClient").then((mod) => mod.RoutinesPageClient),
  { ssr: true },
);
const RoutineHomeClient = nextDynamic(
  () => import("@/app/routines/RoutineHomeClient").then((mod) => mod.RoutineHomeClient),
  { ssr: true },
);
const HistorySessionsClient = nextDynamic(
  () => import("@/app/history/HistorySessionsClient").then((mod) => mod.HistorySessionsClient),
  { ssr: true },
);
const ExerciseBrowserClient = nextDynamic(
  () => import("@/app/history/exercises/ExerciseBrowserClient").then((mod) => mod.ExerciseBrowserClient),
  { ssr: true },
);
const HistoryLogPageClient = nextDynamic(
  () => import("@/app/history/[sessionId]/HistoryLogPageClient").then((mod) => mod.HistoryLogPageClient),
  { ssr: true },
);
const ProgressionHistorySurface = nextDynamic(
  () => import("@/components/history/ProgressionHistorySurface").then((mod) => mod.ProgressionHistorySurface),
  { ssr: true },
);
const NewRoutineDraftForm = nextDynamic(
  () => import("@/app/routines/new/NewRoutineDraftForm").then((mod) => mod.NewRoutineDraftForm),
  { ssr: true },
);
const EditRoutineAutosaveForm = nextDynamic(
  () => import("@/app/routines/[id]/edit/EditRoutineAutosaveForm").then((mod) => mod.EditRoutineAutosaveForm),
  { ssr: true },
);
const SessionPageClient = nextDynamic(() => import("@/components/SessionPageClient").then((mod) => mod.SessionPageClient), {
  ssr: true,
});
const SettingsAccordionClient = nextDynamic(
  () => import("@/components/settings/SettingsAccordionClient").then((mod) => mod.SettingsAccordionClient),
  { ssr: true },
);
const SettingsHeaderIdentity = nextDynamic(
  () => import("@/components/settings/SettingsHeaderIdentity").then((mod) => mod.SettingsHeaderIdentity),
  { ssr: true },
);

const MOCK_EXERCISE_IDS = {
  squat: "11111111-1111-4111-8111-111111111111",
  lunge: "22222222-2222-4222-8222-222222222222",
  bench: "33333333-3333-4333-8333-333333333333",
  row: "44444444-4444-4444-8444-444444444444",
  walk: "55555555-5555-4555-8555-555555555555",
  pullup: "66666666-6666-4666-8666-666666666666",
  plank: "77777777-7777-4777-8777-777777777777",
  rower: "88888888-8888-4888-8888-888888888888",
  bike: "99999999-9999-4999-8999-999999999999",
} as const;

const PREVIEW_ROUTINE_NAME = "Atlas Routine";
const PREVIEW_ROUTINE_SUMMARY = "5 days • 4 training • 1 rest • 16 exercises";
const PREVIEW_SECONDARY_ROUTINE_NAME = "Atlas Hypertrophy";
const PREVIEW_SECONDARY_ROUTINE_SUMMARY = "4 days • 4 training • 0 rest • 14 exercises";
const PREVIEW_DAY_LABEL = "Lower A";
const PREVIEW_CREATE_ROUTINE_NAME = "Atlas Builder";

async function noopActionResult(_: unknown) {
  "use server";
  return { ok: true as const };
}

async function noopAppendDayAction(_: unknown) {
  "use server";
  return { ok: true as const, routineDayId: "regression-day" };
}

async function noopDeleteRoutineDayAction(_: unknown) {
  "use server";
  return { ok: true as const };
}

async function noopSetAction(_: unknown) {
  "use server";
  return {
    ok: true as const,
    data: {
      set: {
        id: "regression-set",
        session_exercise_id: "session-ex-1",
        user_id: "dev-user",
        set_index: 0,
        weight: 225,
        reps: 5,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
    },
  };
}

async function noopSyncQueuedSetLogsAction(_: unknown) {
  "use server";
  return { ok: true as const, data: { results: [] } };
}

function RegressionMarker({ scenario }: { scenario: MobileFixtureScenario }) {
  return <div hidden data-mobile-regression-root="true" data-mobile-regression-id={scenario.id} data-mobile-regression-screen={scenario.screen} />;
}

function getRegressionRenderBoundary(route: MobileRouteKey) {
  switch (route) {
    case "today":
      return "renderTodayScenario";
    case "session":
      return "renderSessionScenario";
    case "routines":
      return "renderRoutinesScenario";
    case "viewDay":
      return "renderViewDayScenario";
    case "editDay":
      return "renderEditDayScenario";
    case "createRoutine":
      return "renderCreateRoutineScenario";
    case "editRoutine":
      return "renderEditRoutineScenario";
    case "addExercise":
      return "renderAddExerciseScenario";
    case "historySessions":
      return "renderHistorySessionsScenario";
    case "historyProgression":
      return "renderHistoryProgressionScenario";
    case "historyExercises":
      return "renderHistoryExercisesScenario";
    case "historyDetail":
      return "renderHistoryDetailScenario";
    case "settings":
      return "renderSettingsScenario";
    case "exerciseDetail":
      return "renderExerciseDetailScenario";
    default:
      return "unknown";
  }
}

function traceMobileRegression(event: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info(`[mobile-regression] ${event}`, details);
}

function RegressionIndex() {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <div hidden data-mobile-regression-root="true" />
      <ContentRail className="space-y-3 py-6">
        <SurfaceCard>
          <AppHeader
            title="Mobile Regression Harness"
            subtitle="Auth-free fixture route for deterministic captures"
            meta="/dev/mobile-regression?screen=today&fixture=default"
            className={CARD_HEADER_CLASS_NAME}
          />
          <div className="space-y-2 text-sm text-[rgb(var(--text-secondary)/0.96)]">
            <p>Use `screen` + `fixture` or pass a direct `scenario` id. The matrix script targets this route at `375`, `393`, and `430` widths.</p>
            <ul className="space-y-2">
              {mobileRegressionScenarios.map((scenario) => (
                <li key={scenario.id}>
                  <Link
                    href={`/dev/mobile-regression?screen=${encodeURIComponent(scenario.screen)}&fixture=${encodeURIComponent(scenario.fixture)}`}
                    className="text-[rgb(var(--text)/0.98)] underline underline-offset-4"
                  >
                    {scenario.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SurfaceCard>
      </ContentRail>
    </MainTabScreen>
  );
}

const mockPickerExercises = [
  {
    id: MOCK_EXERCISE_IDS.squat,
    name: "Back Squat",
    user_id: null,
    is_global: true,
    primary_muscle: "Quads",
    equipment: "Barbell",
    movement_pattern: "Squat",
    measurement_type: "reps" as const,
    default_unit: "lbs",
    calories_estimation_method: null,
    image_howto_path: "/missing/howto-squat.png",
    image_icon_path: "/missing/icon-squat.png",
    how_to_short: "Brace, sit down between the knees, and drive straight up.",
    slug: "back-squat",
  },
  {
    id: MOCK_EXERCISE_IDS.lunge,
    name: "Walking Lunge",
    user_id: null,
    is_global: true,
    primary_muscle: "Glutes",
    equipment: "Dumbbell",
    movement_pattern: "Lunge",
    measurement_type: "reps" as const,
    default_unit: "lbs",
    calories_estimation_method: null,
    image_howto_path: null,
    image_icon_path: "/missing/icon-lunge.png",
    how_to_short: "Keep your stride long and torso stacked over the front foot.",
    slug: "walking-lunge",
  },
  {
    id: MOCK_EXERCISE_IDS.walk,
    name: "Incline Walk",
    user_id: null,
    is_global: true,
    primary_muscle: "Cardio",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    measurement_type: "time_distance" as const,
    default_unit: "mi",
    calories_estimation_method: null,
    image_howto_path: "/missing/howto-walk.png",
    image_icon_path: "/missing/icon-walk.png",
    how_to_short: "Keep the pace steady and maintain nasal breathing if possible.",
    slug: "incline-walk",
  },
  {
    id: MOCK_EXERCISE_IDS.pullup,
    name: "Pull-Up",
    user_id: null,
    is_global: true,
    primary_muscle: "Back",
    equipment: "Pull-Up Bar",
    movement_pattern: "Vertical Pull",
    measurement_type: "reps" as const,
    default_unit: null,
    calories_estimation_method: null,
    image_howto_path: "/missing/howto-pullup.png",
    image_icon_path: "/missing/icon-pullup.png",
    how_to_short: "Start from a dead hang, drive elbows down, and keep the ribs tucked.",
    slug: "pull-up",
  },
  {
    id: MOCK_EXERCISE_IDS.plank,
    name: "Plank",
    user_id: null,
    is_global: true,
    primary_muscle: "Core",
    equipment: "Bodyweight",
    movement_pattern: "Brace",
    measurement_type: "time" as const,
    default_unit: "seconds",
    calories_estimation_method: null,
    image_howto_path: "/missing/howto-plank.png",
    image_icon_path: "/missing/icon-plank.png",
    how_to_short: "Squeeze glutes, keep ribs down, and push the floor away.",
    slug: "plank",
  },
  {
    id: MOCK_EXERCISE_IDS.rower,
    name: "Row Erg Distance",
    user_id: null,
    is_global: true,
    primary_muscle: "Cardio",
    equipment: "Rower",
    movement_pattern: "Gait",
    measurement_type: "distance" as const,
    default_unit: "mi",
    calories_estimation_method: null,
    image_howto_path: null,
    image_icon_path: "/missing/icon-rower.png",
    how_to_short: "Hold a consistent split and let the drive length set the distance.",
    slug: "row-erg-distance",
  },
  {
    id: MOCK_EXERCISE_IDS.bike,
    name: "Air Bike Calories",
    user_id: null,
    is_global: true,
    primary_muscle: "Cardio",
    equipment: "Bike",
    movement_pattern: "Gait",
    measurement_type: "time" as const,
    default_unit: "seconds",
    calories_estimation_method: null,
    image_howto_path: null,
    image_icon_path: "/missing/icon-bike.png",
    how_to_short: "Push steady and treat calories like the primary target instead of time.",
    slug: "air-bike-calories",
  },
];

const LONG_GOAL_SUMMARY = "Goal: 4 sets • 8-10 reps • controlled eccentric • last set AMRAP";

const mockTodayDays = [
  {
    id: "day-1",
    dayIndex: 1,
    name: "Push",
    isRest: false,
    state: "runnable" as const,
    invalidExerciseCount: 0,
    exercises: [
      {
        id: "td-1",
        exerciseId: MOCK_EXERCISE_IDS.bench,
        name: "Bench Press",
        targets: "4 sets x 6 reps @ 185 lbs",
        targetSetsMin: 4,
        targetSetsMax: 4,
        primary_muscle: "Chest",
        equipment: "Barbell",
        movement_pattern: "Horizontal Push",
        measurement_type: "reps" as const,
        image_howto_path: null,
        image_icon_path: "/missing/icon-bench.png",
        slug: "bench-press",
        how_to_short: "Keep the wrists stacked and drive the bar back over the shoulders.",
      },
    ],
  },
  {
    id: "day-2",
    dayIndex: 2,
    name: "Lower",
    isRest: false,
    state: "runnable" as const,
    invalidExerciseCount: 0,
    exercises: [
      {
        id: "td-2",
        exerciseId: MOCK_EXERCISE_IDS.squat,
        name: "Back Squat",
        targets: "4 sets x 5 reps @ 225 lbs",
        targetSetsMin: 4,
        targetSetsMax: 4,
        primary_muscle: "Quads",
        equipment: "Barbell",
        movement_pattern: "Squat",
        measurement_type: "reps" as const,
        image_howto_path: "/missing/howto-squat.png",
        image_icon_path: "/missing/icon-squat.png",
        slug: "back-squat",
        how_to_short: "Brace hard and keep pressure through the whole foot.",
      },
      {
        id: "td-3",
        exerciseId: MOCK_EXERCISE_IDS.lunge,
        name: "Walking Lunge",
        targets: LONG_GOAL_SUMMARY,
        targetSetsMin: 3,
        targetSetsMax: 3,
        primary_muscle: "Glutes",
        equipment: "Dumbbell",
        movement_pattern: "Lunge",
        measurement_type: "reps" as const,
        image_howto_path: null,
        image_icon_path: "/missing/icon-lunge.png",
        slug: "walking-lunge",
        how_to_short: "Stay tall and let the back knee sink straight down.",
      },
      {
        id: "td-4",
        exerciseId: MOCK_EXERCISE_IDS.walk,
        name: "Incline Walk",
        targets: "18 minutes @ 8% grade",
        targetSetsMin: 1,
        targetSetsMax: 1,
        primary_muscle: "Cardio",
        equipment: "Treadmill",
        movement_pattern: "Gait",
        measurement_type: "time_distance" as const,
        image_howto_path: "/missing/howto-walk.png",
        image_icon_path: "/missing/icon-walk.png",
        slug: "incline-walk",
        how_to_short: "Find a pace that keeps posture tall while the incline does the work.",
      },
    ],
  },
  {
    id: "day-3",
    dayIndex: 3,
    name: "Recovery",
    isRest: true,
    state: "rest" as const,
    invalidExerciseCount: 0,
    exercises: [],
  },
  {
    id: "day-4",
    dayIndex: 4,
    name: "Travel Reset",
    isRest: false,
    state: "empty" as const,
    invalidExerciseCount: 0,
    exercises: [],
  },
];

const mockViewDayExercises = [
  {
    id: "view-1",
    name: "Back Squat",
    targets: "4 sets x 5 reps @ 225 lbs",
    exerciseId: MOCK_EXERCISE_IDS.squat,
    image_icon_path: "/missing/icon-squat.png",
    image_howto_path: "/missing/howto-squat.png",
    slug: "back-squat",
  },
  {
    id: "view-2",
    name: "Walking Lunge",
    targets: LONG_GOAL_SUMMARY,
    exerciseId: MOCK_EXERCISE_IDS.lunge,
    image_icon_path: "/missing/icon-lunge.png",
    image_howto_path: null,
    slug: "walking-lunge",
  },
] as const;

const longExerciseInfoHowTo = [
  "Start tall, keep the front foot fully planted, and let the back knee travel straight down without rushing the descent.",
  "Pause briefly at the bottom so the front heel, mid-foot pressure, and stacked torso position all stay honest before you drive up.",
  "If the stride shortens as fatigue builds, reset the step length and keep the load balanced instead of letting the front knee shoot forward.",
  "Treat every rep like a controlled setup: brace, lower, settle, and push through the floor before taking the next step.",
].join(" ");

const mockSessionExercises = [
  {
    id: "session-ex-1",
    exerciseId: MOCK_EXERCISE_IDS.squat,
    name: "Back Squat",
    isSkipped: false,
    defaultUnit: null,
    isCardio: false,
    measurementType: "reps" as const,
    primary_muscle: "Quads",
    equipment: "Barbell",
    movement_pattern: "Squat",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: true, weight: true, time: false, distance: false, calories: false },
    routineDayExerciseId: "routine-row-1",
    planTargetsHash: "11000",
    goalLabel: "4 sets x 5 reps @ 225 lbs",
    prefill: { weight: 225, reps: 5, weightUnit: "lbs" as const },
    quickLogTarget: { measurementType: "reps" as const, repsMin: 5, repsMax: 5, weightMin: 225, weightMax: 225, weightUnit: "lbs" as const },
    initialSets: [
      {
        id: "set-1",
        session_exercise_id: "session-ex-1",
        user_id: "dev-user",
        set_index: 0,
        weight: 225,
        reps: 5,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
    ],
    loggedSetCount: 1,
    targetSetsMin: 4,
    targetSetsMax: 4,
    image_icon_path: "/missing/icon-squat.png",
    image_howto_path: "/missing/howto-squat.png",
    slug: "back-squat",
  },
  {
    id: "session-ex-2",
    exerciseId: MOCK_EXERCISE_IDS.lunge,
    name: "Walking Lunge",
    isSkipped: false,
    defaultUnit: null,
    isCardio: false,
    measurementType: "reps" as const,
    primary_muscle: "Glutes",
    equipment: "Dumbbell",
    movement_pattern: "Lunge",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: true, weight: true, time: false, distance: false, calories: false },
    routineDayExerciseId: "routine-row-2",
    planTargetsHash: "11000",
    goalLabel: LONG_GOAL_SUMMARY,
    prefill: { weight: 35, reps: 8, weightUnit: "lbs" as const },
    quickLogTarget: { measurementType: "reps" as const, repsMin: 8, repsMax: 8, weightMin: 35, weightMax: 35, weightUnit: "lbs" as const },
    initialSets: [],
    loggedSetCount: 0,
    targetSetsMin: 4,
    targetSetsMax: 4,
    image_icon_path: "/missing/icon-lunge.png",
    image_howto_path: null,
    slug: "walking-lunge",
  },
  {
    id: "session-ex-3",
    exerciseId: MOCK_EXERCISE_IDS.walk,
    name: "Incline Walk",
    isSkipped: true,
    defaultUnit: "km" as const,
    isCardio: true,
    measurementType: "time_distance" as const,
    primary_muscle: "Cardio",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: false, weight: false, time: true, distance: true, calories: false },
    routineDayExerciseId: "routine-row-3",
    planTargetsHash: "00110",
    goalLabel: "2.0 km in 18:00 @ 8% grade",
    prefill: { durationSeconds: 1080 },
    quickLogTarget: {
      measurementType: "time_distance" as const,
      durationSeconds: 1080,
      distance: 2,
      distanceUnit: "km" as const,
    },
    initialSets: [],
    loggedSetCount: 0,
    targetSetsMin: 1,
    targetSetsMax: 1,
    image_icon_path: "/missing/icon-walk.png",
    image_howto_path: null,
    slug: "incline-walk",
  },
  {
    id: "session-ex-4",
    exerciseId: MOCK_EXERCISE_IDS.pullup,
    name: "Pull-Up",
    isSkipped: false,
    defaultUnit: null,
    isCardio: false,
    measurementType: "reps" as const,
    primary_muscle: "Back",
    equipment: "Pull-Up Bar",
    movement_pattern: "Vertical Pull",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: true, weight: true, time: false, distance: false, calories: false },
    routineDayExerciseId: "routine-row-4",
    planTargetsHash: "11000",
    goalLabel: "4 sets x 6 reps",
    prefill: { reps: 6 },
    quickLogTarget: { measurementType: "reps" as const, repsMin: 6, repsMax: 6 },
    initialSets: [
      {
        id: "set-4a",
        session_exercise_id: "session-ex-4",
        user_id: "dev-user",
        set_index: 0,
        weight: 0,
        reps: 6,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
      {
        id: "set-4b",
        session_exercise_id: "session-ex-4",
        user_id: "dev-user",
        set_index: 1,
        weight: 0,
        reps: 6,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
      {
        id: "set-4c",
        session_exercise_id: "session-ex-4",
        user_id: "dev-user",
        set_index: 2,
        weight: 0,
        reps: 6,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
      {
        id: "set-4d",
        session_exercise_id: "session-ex-4",
        user_id: "dev-user",
        set_index: 3,
        weight: 0,
        reps: 6,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: 8,
        weight_unit: "lbs" as const,
      },
    ],
    loggedSetCount: 4,
    targetSetsMin: 4,
    targetSetsMax: 4,
    image_icon_path: "/missing/icon-pullup.png",
    image_howto_path: "/missing/howto-pullup.png",
    slug: "pull-up",
  },
  {
    id: "session-ex-5",
    exerciseId: MOCK_EXERCISE_IDS.plank,
    name: "Plank",
    isSkipped: true,
    defaultUnit: null,
    isCardio: false,
    measurementType: "time" as const,
    primary_muscle: "Core",
    equipment: "Bodyweight",
    movement_pattern: "Brace",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: false, weight: false, time: true, distance: false, calories: false },
    routineDayExerciseId: "routine-row-5",
    planTargetsHash: "00100",
    goalLabel: "3 holds x 45 sec",
    prefill: { durationSeconds: 45 },
    quickLogTarget: { measurementType: "time" as const, durationSeconds: 45 },
    initialSets: [
      {
        id: "set-5",
        session_exercise_id: "session-ex-5",
        user_id: "dev-user",
        set_index: 0,
        weight: 0,
        reps: 0,
        is_warmup: false,
        notes: null,
        duration_seconds: 45,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: null,
        weight_unit: "lbs" as const,
      },
    ],
    loggedSetCount: 1,
    targetSetsMin: 3,
    targetSetsMax: 3,
    image_icon_path: "/missing/icon-plank.png",
    image_howto_path: "/missing/howto-plank.png",
    slug: "plank",
  },
  {
    id: "session-ex-6",
    exerciseId: MOCK_EXERCISE_IDS.rower,
    name: "Row Erg Distance",
    isSkipped: false,
    defaultUnit: "mi" as const,
    isCardio: true,
    measurementType: "distance" as const,
    primary_muscle: "Cardio",
    equipment: "Rower",
    movement_pattern: "Gait",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: false, weight: false, time: false, distance: true, calories: false },
    routineDayExerciseId: "routine-row-6",
    planTargetsHash: "00010",
    goalLabel: "3 rounds x 0.5 mi",
    quickLogTarget: { measurementType: "distance" as const, distance: 0.5, distanceUnit: "mi" as const },
    initialSets: [],
    loggedSetCount: 0,
    targetSetsMin: 3,
    targetSetsMax: 3,
    image_icon_path: "/missing/icon-rower.png",
    image_howto_path: null,
    slug: "row-erg-distance",
  },
  {
    id: "session-ex-7",
    exerciseId: MOCK_EXERCISE_IDS.bike,
    name: "Air Bike Calories",
    isSkipped: false,
    defaultUnit: null,
    isCardio: true,
    measurementType: "time" as const,
    primary_muscle: "Cardio",
    equipment: "Bike",
    movement_pattern: "Gait",
    useIntervalLanguage: false,
    initialEnabledMetrics: { reps: false, weight: false, time: false, distance: false, calories: true },
    routineDayExerciseId: "routine-row-7",
    planTargetsHash: "00001",
    goalLabel: "4 rounds x 20 cal",
    quickLogTarget: { measurementType: "time" as const, calories: 20 },
    initialSets: [],
    loggedSetCount: 0,
    targetSetsMin: 4,
    targetSetsMax: 4,
    image_icon_path: "/missing/icon-bike.png",
    image_howto_path: null,
    slug: "air-bike-calories",
  },
];

const mockHistorySessions = [
  {
    id: "history-session-1",
    startedAt: "2026-04-09T13:00:00.000Z",
    routineTitle: "Atlas Push",
    dayTitle: "Push A",
    durationSec: 3120,
    exerciseCount: 6,
    setCount: 18,
    repCount: 88,
    prCounts: { reps: 0, weight: 1, total: 1 },
    prLabel: "1 PR",
    topSet: { exerciseName: "Bench Press", display: "205 lbs x 4" },
    bestLift: { exerciseName: "Bench Press", display: "205 lbs x 4" },
    totalVolume: 6820,
    completionRate: 1,
    hasNote: false,
    hasSetData: true,
  },
  {
    id: "history-session-2",
    startedAt: "2026-04-07T13:00:00.000Z",
    routineTitle: PREVIEW_ROUTINE_NAME,
    dayTitle: PREVIEW_DAY_LABEL,
    durationSec: 3660,
    exerciseCount: 7,
    setCount: 24,
    repCount: 102,
    prCounts: { reps: 1, weight: 1, total: 3 },
    prLabel: "3 PRs",
    topSet: { exerciseName: "Back Squat", display: "275 lbs x 3" },
    bestLift: { exerciseName: "Back Squat", display: "275 lbs x 3" },
    totalVolume: 11340,
    completionRate: 0.86,
    hasNote: true,
    hasSetData: true,
  },
  {
    id: "history-session-3",
    startedAt: "2026-04-05T13:00:00.000Z",
    routineTitle: "Atlas Conditioning",
    dayTitle: "Conditioning",
    durationSec: 2280,
    exerciseCount: 4,
    setCount: 12,
    repCount: 0,
    prCounts: { reps: 0, weight: 0, total: 0 },
    prLabel: "",
    totalVolume: 0,
    completionRate: 0.75,
    hasNote: false,
    hasSetData: false,
  },
];

const mockHistoryWeeklyProgress: WeeklyProgressSummary = {
  timezone: "America/New_York",
  weekStart: "2026-04-06",
  weekEnd: "2026-04-12",
  primaryRoutineTitle: "Atlas",
  primaryRoutineTargetCount: 4,
  completedWorkoutCount: 3,
  previousWeekWorkoutCount: 2,
  activeDayCount: 3,
  prMomentCount: 4,
  prExerciseNames: ["Back Squat", "Bench Press", "Weighted Chin-Up"],
  consistencyTrend: {
    direction: "up",
    label: "+1 vs last week",
    detail: "3 workouts this week, 2 workouts last week.",
    delta: 1,
  },
  volumeCategories: [
    { key: "strength", label: "Strength", setCount: 34, exerciseCount: 7 },
    { key: "cardio", label: "Cardio", setCount: 6, exerciseCount: 2 },
  ],
  progressScore: {
    value: 8,
    max: 10,
    breakdown: [
      { label: "Workouts", value: 3, max: 4 },
      { label: "PRs", value: 3, max: 3 },
      { label: "Consistency", value: 2, max: 2 },
      { label: "Coverage", value: 0, max: 1 },
    ],
    summary: "3/4 workouts • 3/3 prs • 2/2 consistency",
  },
  progressionSummary: {
    totalEventCount: 4,
    promotionCount: 2,
    deloadCount: 1,
    manualChangeCount: 1,
    chartSections: [
      {
        id: "progression-activity",
        title: "Progression Activity",
        description: "How progression changes stacked across the current week.",
        emptyTitle: "No progression activity yet.",
        emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
        bars: [
          { id: "2026-04-07", label: "Apr 7", value: 1, valueLabel: "1 event", detail: "1 change landed." },
          { id: "2026-04-08", label: "Apr 8", value: 2, valueLabel: "2 events", detail: "2 changes landed." },
          { id: "2026-04-10", label: "Apr 10", value: 1, valueLabel: "1 event", detail: "1 change landed." },
        ],
      },
      {
        id: "progression-event-mix",
        title: "Change Mix",
        description: "Which change types are driving the visible progression slice.",
        emptyTitle: "No change mix yet.",
        emptyCaption: "The mix appears after the first progression event is recorded.",
        bars: [
          { id: "promotion_applied", label: "Promotion applied", value: 2, valueLabel: "2 events", detail: null },
          { id: "deload_applied", label: "Deload applied", value: 1, valueLabel: "1 event", detail: null },
          { id: "manual_target_change", label: "Manual target change", value: 1, valueLabel: "1 event", detail: null },
        ],
      },
      {
        id: "progression-hotspots",
        title: "Promotion Hotspots",
        description: "Exercises with the most promotions in the visible progression slice.",
        emptyTitle: "No promotion hotspots yet.",
        emptyCaption: "Promotion hotspots appear after the first applied promotion lands.",
        bars: [
          { id: "back-squat", label: "Back Squat", value: 1, valueLabel: "1 promotion", detail: null },
          { id: "bench-press", label: "Bench Press", value: 1, valueLabel: "1 promotion", detail: null },
        ],
      },
    ],
    activityBuckets: [
      {
        id: "2026-04-07",
        label: "Apr 7",
        detail: "1 change landed.",
        valueLabel: "1 event",
        eventCount: 1,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        items: [
          "Back Squat promoted | 5 reps -> 6 reps",
        ],
        hotspotItems: [
          "Back Squat drove the most promotions.",
        ],
      },
      {
        id: "2026-04-08",
        label: "Apr 8",
        detail: "2 changes landed.",
        valueLabel: "2 events",
        eventCount: 2,
        promotionCount: 0,
        deloadCount: 1,
        manualChangeCount: 1,
        revertCount: 0,
        items: [
          "Bench Press regressed | 225 lbs -> 215 lbs",
          "Incline Walk manual target change | 12:00 -> 15:00",
        ],
        hotspotItems: [
          "Bench Press had the most regressions.",
          "Incline Walk had the most manual target changes.",
        ],
      },
      {
        id: "2026-04-10",
        label: "Apr 10",
        detail: "1 change landed.",
        valueLabel: "1 event",
        eventCount: 1,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        items: [
          "Bench Press promoted | 215 lbs -> 225 lbs",
        ],
        hotspotItems: [
          "Bench Press drove the most promotions.",
        ],
      },
    ],
    topProgressedExerciseNames: ["Back Squat", "Bench Press"],
    topDeloadExerciseNames: ["Bench Press"],
    topAdjustedExerciseNames: ["Incline Walk"],
    reviewItems: [
    ],
    hotspotItems: [
      "Back Squat drove the most promotions.",
      "Bench Press had the most regressions.",
      "Incline Walk had the most manual target changes.",
    ],
    timelineItems: [
      "Active progression days: 3 days.",
      "Busiest day: Apr 10 (2 events).",
      "Latest progression: Bench Press on Apr 10.",
    ],
    attentionItems: [],
  },
  hotspotItems: [
    "Back Squat led the cycle with 2 sessions, had the strongest PR signal, and drove the most promotions.",
    "Bench Press had the most regressions.",
    "Incline Walk had the most manual target changes.",
  ],
  attentionItems: [
    "1 planned day is still open this cycle.",
  ],
  recapItems: [
    { id: "weekly-recap-back-squat", primary: "Back Squat", value: "2 sessions", signals: ["pr", "promotion"], layout: "single-column" },
    { id: "weekly-recap-bench-press", primary: "Bench Press", value: "1 session", signals: ["promotion", "regression"], layout: "single-column" },
    { id: "weekly-recap-incline-walk", primary: "Incline Walk", value: "progression", signals: ["watch"], tagLabels: ["MANUAL"], layout: "single-column" },
  ],
};

const mockHistoryScopeSummary: HistoryScopeSummary = {
  timezone: "America/New_York",
  windowStart: "2026-03-11",
  windowEnd: "2026-04-09",
  scopeLabel: "All Time",
  primaryRoutineTitle: PREVIEW_ROUTINE_NAME,
  completedWorkoutCount: 3,
  activeDayCount: 3,
  plannedWorkoutDayCount: 4,
  completedWorkoutDayCount: 3,
  skippedWorkoutDayCount: 1,
  exerciseCount: 13,
  routineCount: 3,
  prMomentCount: 4,
  prExerciseNames: ["Back Squat", "Bench Press", "Weighted Chin-Up"],
  primaryRoutineCoverage: {
    completedDayCount: 1,
    targetDayCount: 4,
  },
  consistencyTrend: {
    direction: "up",
    label: "+1 this week",
    detail: "2 workouts in the last 7 days, up from 1 the week before.",
    delta: 1,
  },
  progressionSummary: {
    totalEventCount: 4,
    promotionCount: 2,
    deloadCount: 1,
    manualChangeCount: 1,
    revertCount: 0,
    chartSections: [
      {
        id: "progression-activity",
        title: "Progression Timeline",
        description: "How progression changes stacked across recent weekly buckets.",
        emptyTitle: "No progression activity yet.",
        emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
        bars: [
          { id: "2026-03-30", label: "Mar 30 - Apr 5", value: 1, valueLabel: "1 event", detail: "1 change landed." },
          { id: "2026-04-06", label: "Apr 6 - Apr 12", value: 3, valueLabel: "3 events", detail: "3 changes landed." },
        ],
      },
      {
        id: "progression-event-mix",
        title: "Change Mix",
        description: "Which change types are driving the visible progression slice.",
        emptyTitle: "No change mix yet.",
        emptyCaption: "The mix appears after the first progression event is recorded.",
        bars: [
          { id: "promotion_applied", label: "Promotion applied", value: 2, valueLabel: "2 events", detail: null },
          { id: "deload_applied", label: "Deload applied", value: 1, valueLabel: "1 event", detail: null },
          { id: "manual_target_change", label: "Manual target change", value: 1, valueLabel: "1 event", detail: null },
        ],
      },
      {
        id: "progression-hotspots",
        title: "Promotion Hotspots",
        description: "Exercises with the most promotions in the visible progression slice.",
        emptyTitle: "No promotion hotspots yet.",
        emptyCaption: "Promotion hotspots appear after the first applied promotion lands.",
        bars: [
          { id: "back-squat", label: "Back Squat", value: 1, valueLabel: "1 promotion", detail: null },
          { id: "bench-press", label: "Bench Press", value: 1, valueLabel: "1 promotion", detail: null },
        ],
      },
    ],
    activityBuckets: [
      {
        id: "2026-03-30",
        label: "Mar 30 - Apr 5",
        detail: "1 change landed.",
        valueLabel: "1 event",
        eventCount: 1,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        items: [
          "Back Squat promoted | 5 reps -> 6 reps",
        ],
        hotspotItems: [
          "Back Squat drove the most promotions.",
        ],
      },
      {
        id: "2026-04-06",
        label: "Apr 6 - Apr 12",
        detail: "3 changes landed.",
        valueLabel: "3 events",
        eventCount: 3,
        promotionCount: 1,
        deloadCount: 1,
        manualChangeCount: 1,
        revertCount: 0,
        items: [
          "Bench Press promoted | 215 lbs -> 225 lbs",
          "Bench Press regressed | 225 lbs -> 215 lbs",
          "Incline Walk manual target change | 12:00 -> 15:00",
        ],
        hotspotItems: [
          "Bench Press drove the most promotions.",
          "Bench Press had the most regressions.",
          "Incline Walk had the most manual target changes.",
        ],
      },
    ],
    topProgressedExerciseNames: ["Back Squat", "Bench Press"],
    topDeloadExerciseNames: ["Bench Press"],
    topAdjustedExerciseNames: ["Incline Walk"],
    reviewItems: [
    ],
    hotspotItems: [
      "Back Squat drove the most promotions.",
      "Bench Press had the most regressions.",
      "Incline Walk had the most manual target changes.",
    ],
    timelineItems: [
      "Active weeks: 3 weeks.",
      "Busiest week: Apr 7 (2 events).",
      "Latest progression: Bench Press on Apr 9.",
    ],
    attentionItems: [],
  },
  hotspotItems: [
    "Back Squat led progress across this scope and drove the most promotions.",
    "Incline Walk appeared in 1 session without a PR or progression signal.",
    "Bench Press had the most regressions.",
    "Incline Walk had the most manual target changes.",
  ],
  reviewItems: [
    "3 completed workout days across 3 routines.",
    `${PREVIEW_ROUTINE_NAME} led with 1 workout.`,
    "13 exercises trained.",
  ],
  attentionItems: [],
  recapItems: [
    { id: "scope-recap-back-squat", primary: "Back Squat", value: "2 sessions", signals: ["pr", "promotion"], layout: "single-column" },
    { id: "scope-recap-bench-press", primary: "Bench Press", value: "1 session", signals: ["pr", "promotion", "regression"], layout: "single-column" },
    { id: "scope-recap-incline-walk", primary: "Incline Walk", value: "1 session", signals: ["watch"], tagLabels: ["MANUAL"], layout: "single-column" },
    { id: "scope-recap-weighted-chin-up", primary: "Weighted Chin-Up", value: "1 session", signals: ["pr"] },
  ],
};

const mockHistoryExerciseRows = [
  {
    exerciseId: MOCK_EXERCISE_IDS.walk,
    name: "Incline Walk",
    slug: "incline-walk",
    image_path: null,
    image_icon_path: "/missing/icon-walk.png",
    image_howto_path: "/missing/howto-walk.png",
    how_to_short: "Steady treadmill incline walk.",
    primary_muscle: "Cardio",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    last_performed_at: "2026-04-09T13:00:00.000Z",
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "cardio" as const,
    lastSummary: "22m • 1.7 mi • 12:56/mi",
    bestSummary: "Best: 2.1 mi",
    prLabel: "",
    prCount: 0,
    sessionCount: 12,
    deltaFromBest: "-0.4mi vs best",
    tagsSummary: "Cardio | Gait | Treadmill",
  },
  {
    exerciseId: MOCK_EXERCISE_IDS.row,
    name: "Chest-Supported Row With Extremely Long Exercise Label To Force Wrap",
    slug: "chest-supported-row",
    image_path: null,
    image_icon_path: "/missing/icon-row.png",
    image_howto_path: "/missing/howto-row.png",
    how_to_short: "Pull elbows to hips and pause hard at the top.",
    primary_muscle: "Back",
    equipment: "Machine",
    movement_pattern: "Horizontal Pull",
    last_performed_at: "2026-04-06T13:00:00.000Z",
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "strength" as const,
    lastSummary: "Technique reset block | 4 controlled sets | slow eccentric | pause on every top-end squeeze",
    bestSummary: null,
    prLabel: "",
    prCount: 0,
    sessionCount: 3,
    deltaFromBest: null,
    tagsSummary: "Back | Horizontal Pull | Machine",
  },
  {
    exerciseId: MOCK_EXERCISE_IDS.pullup,
    name: "Pull-Up",
    slug: "pull-up",
    image_path: null,
    image_icon_path: "/missing/icon-pullup.png",
    image_howto_path: "/missing/howto-pullup.png",
    how_to_short: "Drive elbows down and stay hollow through the trunk.",
    primary_muscle: "Back",
    equipment: "Pull-Up Bar",
    movement_pattern: "Vertical Pull",
    last_performed_at: "2026-04-08T13:00:00.000Z",
    last_weight: 0,
    last_reps: 9,
    last_unit: null,
    pr_weight: null,
    pr_reps: 12,
    pr_est_1rm: null,
    actual_pr_weight: 0,
    actual_pr_reps: 12,
    actual_pr_at: "2026-03-28T13:00:00.000Z",
    kind: "strength" as const,
    lastSummary: "9 reps",
    bestSummary: "Best: 12 reps",
    prLabel: "Rep PR",
    prCount: 1,
    sessionCount: 9,
    deltaFromBest: "-3 reps vs best",
    tagsSummary: "Bodyweight | Vertical Pull | Pull-Up Bar",
  },
  {
    exerciseId: MOCK_EXERCISE_IDS.plank,
    name: "Plank",
    slug: "plank",
    image_path: null,
    image_icon_path: "/missing/icon-plank.png",
    image_howto_path: "/missing/howto-plank.png",
    how_to_short: "Lock the ribcage down and keep the pelvis tucked.",
    primary_muscle: "Core",
    equipment: "Bodyweight",
    movement_pattern: "Brace",
    last_performed_at: "2026-04-10T13:00:00.000Z",
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "cardio" as const,
    lastSummary: "60 sec hold",
    bestSummary: "Best: 90 sec",
    prLabel: "",
    prCount: 0,
    sessionCount: 11,
    deltaFromBest: "-30 sec vs best",
    tagsSummary: "Timed | Brace | Bodyweight",
  },
];

const mockHistoryDetailExercises = [
  {
    id: "audit-1",
    exercise_id: MOCK_EXERCISE_IDS.squat,
    exercise_name: "Back Squat",
    exercise_slug: "back-squat",
    exercise_image_icon_path: "/missing/icon-squat.png",
    exercise_image_howto_path: "/missing/howto-squat.png",
    notes: "Broken image fallback should keep the row height stable.",
    measurement_type: "reps" as const,
    default_unit: "lbs",
    progressionSummary: {
      eventCount: 3,
      promotionCount: 1,
      deloadCount: 0,
      manualChangeCount: 1,
      revertCount: 1,
      lockInCount: 0,
      linkedSessionCount: 2,
      distinctExerciseCount: 1,
      firstChangeAt: "2026-03-31T12:00:00.000Z",
      latestChangeAt: "2026-04-07T13:00:00.000Z",
      lastPromotionAt: "2026-04-07T13:00:00.000Z",
      firstTargetLabel: "4 reps | 225 lbs",
      currentTargetLabel: "5 reps | 225 lbs",
      latestChangeSummary: "Reps increased | 4 reps | 225 lbs -> 5 reps | 225 lbs",
      latestEventLabel: "Promotion applied",
      timelineSummary: "4 reps | 225 lbs -> 5 reps | 225 lbs",
      recentWindowDays: 30,
      recentEventCount: 3,
      recentPromotionCount: 1,
      recentDeloadCount: 0,
      recentManualChangeCount: 1,
      recentActivitySummary: "3 updates | 1 promotion | 1 manual change | 1 revert",
      recentFocusSummary: "1 promotion led recent changes",
      activityDays: [
        {
          id: "2026-03-31",
          label: "Mar 31",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 0,
          deloadCount: 0,
          manualChangeCount: 1,
          revertCount: 0,
          items: [
            "Manual change | 4 reps | 215 lbs -> 4 reps | 225 lbs",
          ],
        },
        {
          id: "2026-04-04",
          label: "Apr 4",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 0,
          deloadCount: 0,
          manualChangeCount: 0,
          revertCount: 1,
          items: [
            "Promotion reverted | 5 reps | 225 lbs -> 4 reps | 225 lbs",
          ],
        },
        {
          id: "2026-04-07",
          label: "Apr 7",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 1,
          deloadCount: 0,
          manualChangeCount: 0,
          revertCount: 0,
          items: [
            "Promotion | 4 reps | 225 lbs -> 5 reps | 225 lbs",
          ],
        },
      ],
      lifelineItems: [
        "Latest: Reps increased | 4 reps | 225 lbs -> 5 reps | 225 lbs",
        "Started: 4 reps | 225 lbs",
        "Current: 5 reps | 225 lbs",
      ],
    },
    sets: [
      {
        id: "audit-set-1",
        set_index: 0,
        weight: 225,
        reps: 5,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        weight_unit: "lbs" as const,
      },
      {
        id: "audit-set-2",
        set_index: 1,
        weight: 245,
        reps: 3,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        weight_unit: "lbs" as const,
      },
    ],
  },
  {
    id: "audit-2",
    exercise_id: MOCK_EXERCISE_IDS.walk,
    exercise_name: "Incline Walk",
    exercise_slug: "incline-walk",
    exercise_image_icon_path: "/missing/icon-walk.png",
    exercise_image_howto_path: "/missing/howto-walk.png",
    notes: null,
    measurement_type: "time_distance" as const,
    default_unit: "mi",
    progressionSummary: {
      eventCount: 2,
      promotionCount: 1,
      deloadCount: 0,
      manualChangeCount: 1,
      revertCount: 0,
      lockInCount: 0,
      linkedSessionCount: 1,
      distinctExerciseCount: 1,
      firstChangeAt: "2026-04-01T12:00:00.000Z",
      latestChangeAt: "2026-04-06T12:00:00.000Z",
      lastPromotionAt: "2026-04-06T12:00:00.000Z",
      firstTargetLabel: "18:00 | 1 mi",
      currentTargetLabel: "20:00 | 1.2 mi",
      latestChangeSummary: "Distance added | 20:00 | 1 mi -> 20:00 | 1.2 mi",
      latestEventLabel: "Promotion applied",
      timelineSummary: "18:00 | 1 mi -> 20:00 | 1.2 mi",
      recentWindowDays: 30,
      recentEventCount: 2,
      recentPromotionCount: 1,
      recentDeloadCount: 0,
      recentManualChangeCount: 1,
      recentActivitySummary: "2 updates | 1 promotion | 1 manual change",
      recentFocusSummary: "1 promotion led recent changes",
      activityDays: [
        {
          id: "2026-04-01",
          label: "Apr 1",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 0,
          deloadCount: 0,
          manualChangeCount: 1,
          revertCount: 0,
          items: [
            "Manual change | 18:00 | 1 mi -> 20:00 | 1 mi",
          ],
        },
        {
          id: "2026-04-06",
          label: "Apr 6",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 1,
          deloadCount: 0,
          manualChangeCount: 0,
          revertCount: 0,
          items: [
            "Promotion | 20:00 | 1 mi -> 20:00 | 1.2 mi",
          ],
        },
      ],
      lifelineItems: [
        "Latest: Distance added | 20:00 | 1 mi -> 20:00 | 1.2 mi",
        "Started: 18:00 | 1 mi",
        "Current: 20:00 | 1.2 mi",
      ],
    },
    sets: [
      {
        id: "audit-set-3",
        set_index: 0,
        weight: 0,
        reps: 0,
        duration_seconds: 1200,
        distance: 1.2,
        distance_unit: "mi" as const,
        calories: 180,
        weight_unit: null,
      },
    ],
  },
];

const mockTodayProgressionReviewItems: ProgressionReviewDisplayItem[] = [
  {
    id: "td-2",
    exerciseName: "Back Squat",
    dayName: "Lower",
    dayGroupId: "day-2",
    type: "promote",
    badgeLabel: "Promote",
    summary: "Back Squat: 225 lbs x 5 -> 230 lbs x 5",
    summaryParts: {
      exerciseName: "Back Squat",
      currentTarget: "225 lbs x 5",
      proposedTarget: "230 lbs x 5",
      fallback: null,
    },
    reason: "Ready: met the load evidence requirement from the latest qualifying session.",
    actionLabel: "Promote",
    currentTarget: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    proposedTarget: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 230,
      weightMax: 230,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
  },
];

const mockHistoryDetailLongMetricExercises = [
  {
    id: "audit-3",
    exercise_id: MOCK_EXERCISE_IDS.pullup,
    exercise_name: "Weighted Pull-Up",
    exercise_slug: "weighted-pull-up",
    exercise_image_icon_path: "/missing/icon-pullup.png",
    exercise_image_howto_path: "/missing/howto-pullup.png",
    notes: null,
    measurement_type: "reps" as const,
    default_unit: "lbs",
    progressionSummary: {
      eventCount: 2,
      promotionCount: 1,
      deloadCount: 0,
      manualChangeCount: 1,
      revertCount: 0,
      lockInCount: 0,
      linkedSessionCount: 1,
      distinctExerciseCount: 1,
      firstChangeAt: "2026-04-02T12:00:00.000Z",
      latestChangeAt: "2026-04-07T13:00:00.000Z",
      lastPromotionAt: "2026-04-07T13:00:00.000Z",
      firstTargetLabel: "6 reps | 45 lbs",
      currentTargetLabel: "7 reps | 45 lbs",
      latestChangeSummary: "Reps increased | 6 reps | 45 lbs -> 7 reps | 45 lbs",
      latestEventLabel: "Promotion applied",
      timelineSummary: "6 reps | 45 lbs -> 7 reps | 45 lbs",
      recentWindowDays: 30,
      recentEventCount: 2,
      recentPromotionCount: 1,
      recentDeloadCount: 0,
      recentManualChangeCount: 1,
      recentActivitySummary: "2 updates | 1 promotion | 1 manual change",
      recentFocusSummary: "1 promotion led recent changes",
      activityDays: [
        {
          id: "2026-04-02",
          label: "Apr 2",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 0,
          deloadCount: 0,
          manualChangeCount: 1,
          revertCount: 0,
          items: [
            "Manual change | 6 reps | 35 lbs -> 6 reps | 45 lbs",
          ],
        },
        {
          id: "2026-04-07",
          label: "Apr 7",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 1,
          deloadCount: 0,
          manualChangeCount: 0,
          revertCount: 0,
          items: [
            "Promotion | 6 reps | 45 lbs -> 7 reps | 45 lbs",
          ],
        },
      ],
      lifelineItems: [
        "Latest: Reps increased | 6 reps | 45 lbs -> 7 reps | 45 lbs",
        "Started: 6 reps | 45 lbs",
        "Current: 7 reps | 45 lbs",
      ],
    },
    sets: [
      {
        id: "audit-set-4",
        set_index: 0,
        weight: 45,
        reps: 6,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        weight_unit: "lbs" as const,
      },
      {
        id: "audit-set-5",
        set_index: 1,
        weight: 45,
        reps: 7,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        weight_unit: "lbs" as const,
      },
    ],
  },
  {
    id: "audit-4",
    exercise_id: MOCK_EXERCISE_IDS.row,
    exercise_name: "Chest-Supported Row",
    exercise_slug: "chest-supported-row",
    exercise_image_icon_path: "/missing/icon-row.png",
    exercise_image_howto_path: "/missing/howto-row.png",
    notes: "Carryover note should stay hidden when nothing was logged for this exercise in the session.",
    measurement_type: "reps" as const,
    default_unit: "lbs",
    progressionSummary: null,
    sets: [],
  },
];

const mockTodayProgressionStatusItems: ProgressionStatusSurfaceItem[] = [
  {
    id: "td-2",
    exerciseName: "Back Squat",
    dayName: "Lower",
    dayGroupId: "day-2",
    readinessState: "ready",
    readinessLabel: "Ready",
    currentTargetLine: "Current target: 225 lbs x 5",
    promotionBasisLabel: "Weight only",
    promotionBasisDetail: "Weight only: Reps are tracked for guidance but do not affect auto-promotion.",
    repTargetLine: "Top half of range (10+ reps)",
    latestLine: "Latest: Jun 8 | 225 lbs | 10 / 10 / 10 / 10 reps",
    targetLine: "Needs: 4 sets at the current load with top-half reps.",
    detailLine: "Result: ready to increase the load on the next update.",
    nextUpdateLine: "Next update: 230 lbs x 5",
    reason: "Ready: met the load evidence requirement from the latest qualifying session.",
    progress: {
      percent: 100,
      state: "ready",
      label: "Ready",
    },
  },
];

const mockTodayLinkedProgressionReviewItems: ProgressionReviewDisplayItem[] = [
  {
    id: "td-2",
    exerciseName: "Back Squat",
    dayName: "Lower",
    dayGroupId: "day-2",
    linkedUpdate: {
      count: 2,
      dayNames: ["Lower", "Push"],
      routineDayExerciseIds: ["td-2", "td-1"],
      targets: [
        {
          routineDayExerciseId: "td-2",
          dayName: "Lower",
          dayGroupId: "day-2",
        },
        {
          routineDayExerciseId: "td-1",
          dayName: "Push",
          dayGroupId: "day-1",
        },
      ],
      displayOnly: true,
    },
    type: "promote",
    badgeLabel: "Promote",
    summary: "Back Squat: 225 lbs x 5 -> 230 lbs x 5",
    summaryParts: {
      exerciseName: "Back Squat",
      currentTarget: "225 lbs x 5",
      proposedTarget: "230 lbs x 5",
      fallback: null,
    },
    reason: "Ready: linked days share the same target and can be promoted together.",
    actionLabel: "Promote",
    currentTarget: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    proposedTarget: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 230,
      weightMax: 230,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
  },
];

const mockProgressionHistoryEvents: ProgressionAnalyticsEvent[] = [
  {
    id: "progress-event-4",
    user_id: "dev-user",
    routine_id: "routine-1",
    routine_day_exercise_id: "td-2",
    exercise_id: MOCK_EXERCISE_IDS.squat,
    event_type: "promotion_applied",
    from_target: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    to_target: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 230,
      weightMax: 230,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    method: "double_progression",
    vector: "load",
    step: {
      vector: "load",
      loadDelta: 5,
    },
    reason: "Ready: met the weight-only promotion rule.",
    source_session_id: "history-session-2",
    created_at: "2026-05-10T14:30:00.000Z",
  },
  {
    id: "progress-event-3",
    user_id: "dev-user",
    routine_id: "routine-1",
    routine_day_exercise_id: "td-3",
    exercise_id: MOCK_EXERCISE_IDS.lunge,
    event_type: "manual_target_change",
    from_target: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: null,
      repsMin: 8,
      repsMax: 12,
      weightMin: 35,
      weightMax: 35,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    to_target: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: null,
      repsMin: 8,
      repsMax: 12,
      weightMin: 40,
      weightMax: 40,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    method: "double_progression",
    vector: "load",
    step: {
      vector: "load",
      loadDelta: 5,
    },
    reason: "Manual target increase after accessory block review.",
    source_session_id: null,
    created_at: "2026-05-08T11:15:00.000Z",
  },
  {
    id: "progress-event-2",
    user_id: "dev-user",
    routine_id: "routine-2",
    routine_day_exercise_id: "td-4",
    exercise_id: MOCK_EXERCISE_IDS.walk,
    event_type: "deload_applied",
    from_target: {
      measurementType: "time_distance",
      setsMin: 1,
      setsMax: 1,
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1200,
      distance: 1.35,
      distanceUnit: "mi",
      calories: null,
    },
    to_target: {
      measurementType: "time_distance",
      setsMin: 1,
      setsMax: 1,
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1080,
      distance: 1.2,
      distanceUnit: "mi",
      calories: null,
    },
    method: "cardio_progression",
    vector: "coupled_duration_distance",
    step: {
      vector: "coupled_duration_distance",
      durationSecondsDelta: -120,
      distanceDelta: -0.15,
    },
    reason: "Deload applied after repeated missed cardio targets.",
    source_session_id: "history-session-1",
    created_at: "2026-05-05T09:00:00.000Z",
  },
  {
    id: "progress-event-1",
    user_id: "dev-user",
    routine_id: "routine-1",
    routine_day_exercise_id: "td-2",
    exercise_id: MOCK_EXERCISE_IDS.squat,
    event_type: "promotion_reverted",
    from_target: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 230,
      weightMax: 230,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    to_target: {
      measurementType: "reps",
      setsMin: 4,
      setsMax: 4,
      repsTarget: null,
      repsMin: 5,
      repsMax: 5,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    method: "double_progression",
    vector: "load",
    step: {
      vector: "load",
      loadDelta: -5,
    },
    reason: "Reverted after logging the wrong target.",
    source_session_id: null,
    created_at: "2026-05-02T16:45:00.000Z",
  },
];

const mockProgressionHistoryRoutineNameById = new Map([
  ["routine-1", PREVIEW_ROUTINE_NAME],
  ["routine-2", PREVIEW_SECONDARY_ROUTINE_NAME],
]);

const mockProgressionHistoryExerciseNameById = new Map([
  [MOCK_EXERCISE_IDS.squat, "Back Squat"],
  [MOCK_EXERCISE_IDS.lunge, "Walking Lunge"],
  [MOCK_EXERCISE_IDS.walk, "Incline Walk"],
]);

const mockFilteredProgressionHistoryFilters: ProgressionHistoryFilters = {
  eventType: "promotion_applied",
  routineId: "routine-1",
  exerciseId: MOCK_EXERCISE_IDS.squat,
  dateFrom: "2026-05-08",
  dateTo: "2026-05-10",
};

const mockProgressionHistoryDisplayModel: ProgressionHistoryDisplayModel = buildProgressionHistoryDisplayModel({
  events: mockProgressionHistoryEvents,
  routineNameById: mockProgressionHistoryRoutineNameById,
  exerciseNameById: mockProgressionHistoryExerciseNameById,
  filterOptions: buildProgressionHistoryFilterOptions({
    events: mockProgressionHistoryEvents,
    routineNameById: mockProgressionHistoryRoutineNameById,
    exerciseNameById: mockProgressionHistoryExerciseNameById,
    filters: {
      eventType: null,
      routineId: null,
      exerciseId: null,
      dateFrom: null,
      dateTo: null,
    },
  }),
  totalEventCount: mockProgressionHistoryEvents.length,
});

const mockFilteredProgressionHistoryDisplayModel: ProgressionHistoryDisplayModel = buildProgressionHistoryDisplayModel({
  events: applyProgressionHistoryFilters(mockProgressionHistoryEvents, mockFilteredProgressionHistoryFilters),
  routineNameById: mockProgressionHistoryRoutineNameById,
  exerciseNameById: mockProgressionHistoryExerciseNameById,
  filters: mockFilteredProgressionHistoryFilters,
  filterOptions: buildProgressionHistoryFilterOptions({
    events: mockProgressionHistoryEvents,
    routineNameById: mockProgressionHistoryRoutineNameById,
    exerciseNameById: mockProgressionHistoryExerciseNameById,
    filters: mockFilteredProgressionHistoryFilters,
  }),
  totalEventCount: mockProgressionHistoryEvents.length,
});

function renderTodayScenario(scenario: MobileFixtureScenario) {
  const selectedDayIndex = scenario.id === "today-rest"
    ? 3
    : scenario.id === "today-empty"
      ? 4
      : 2;
  const selectedDay = mockTodayDays.find((day) => day.dayIndex === selectedDayIndex) ?? mockTodayDays[1];
  const exerciseDensity = scenario.id === "today-detailed" ? "detailed" : "compact";
  const progressionReviewItems = scenario.id === "today-progression-linked"
    ? mockTodayLinkedProgressionReviewItems
    : scenario.id === "today-progression-status"
      ? mockTodayProgressionReviewItems
      : [];
  const progressionStatusItems = scenario.id === "today-progression-status"
    ? mockTodayProgressionStatusItems
    : [];

  if (scenario.id === "today-in-session-summary") {
    return (
      <MainTabScreen topNavMode="none">
        <RegressionMarker scenario={scenario} />
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail>
              <ScreenScaffold recipe="todayOverview" className="w-full">
                <SharedScreenHeader
                  recipe="todayOverview"
                  title={PREVIEW_ROUTINE_NAME}
                  subtitle={<DayTaxonomyHeaderSummary dayName={selectedDay.name} summary={getRestDayExerciseCountSummaryFromInputs(selectedDay.exercises, false)} isRest={false} />}
                  action={<AppBadge tone="success">In Session</AppBadge>}
                />
              </ScreenScaffold>
            </ContentRail>
          )}
        >
          <ContentRail className="space-y-3">
            <ScreenScaffold recipe="todayOverview" className="w-full">
              <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
                <TodayExerciseRows
                  exercises={[
                    {
                      id: "summary-1",
                      exerciseId: MOCK_EXERCISE_IDS.squat,
                      name: "Back Squat",
                      targets: "4 sets x 5 reps @ 225 lbs",
                      image_icon_path: "/missing/icon-squat.png",
                      image_howto_path: "/missing/howto-squat.png",
                      slug: "back-squat",
                      loggedSetCount: 4,
                      targetSetsMin: 4,
                      targetSetsMax: 4,
                    },
                    {
                      id: "summary-2",
                      exerciseId: MOCK_EXERCISE_IDS.lunge,
                      name: "Walking Lunge",
                      targets: LONG_GOAL_SUMMARY,
                      image_icon_path: "/missing/icon-lunge.png",
                      image_howto_path: null,
                      slug: "walking-lunge",
                      loggedSetCount: 3,
                      targetSetsMin: 3,
                      targetSetsMax: 3,
                    },
                  ]}
                  emptyMessage="No runnable exercises planned for this day."
                  density={exerciseDensity}
                />
              </SharedSectionShell>
            </ScreenScaffold>
          </ContentRail>

          <PublishBottomActions>
            <BottomActionSplit
              secondary={<BottomDockButton type="button" intent="danger">Discard</BottomDockButton>}
              primary={<TodayStartButton sessionId="dev-session" returnTo="/today" label="Resume" fullWidth className="w-full" />}
            />
          </PublishBottomActions>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }

  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail>
            <ScreenScaffold recipe="todayOverview" className="w-full">
              <div id="today-floating-header-slot" />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <TodayDayPicker
            days={mockTodayDays}
            currentDayIndex={selectedDayIndex}
            completedDayIndexes={[1]}
            loggedSetCountsByDayIndex={{ 2: 5 }}
            routineName={PREVIEW_ROUTINE_NAME}
            startDate="2025-03-10"
            floatingHeaderSlotId="today-floating-header-slot"
            exerciseDensity={exerciseDensity}
            progressionRoutineId="routine-1"
            progressionReviewItems={progressionReviewItems}
            progressionStatusItems={progressionStatusItems}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderSessionScenario(scenario: MobileFixtureScenario) {
  if (
    scenario.id === "session-logger-combo-board"
    || scenario.id === "session-logger-combo-board-2"
    || scenario.id === "session-logger-combo-board-3"
    || scenario.id === "session-logger-combo-board-4"
  ) {
    const sectionByScenarioId: Record<string, "q1" | "q2" | "q3" | "q4"> = {
      "session-logger-combo-board": "q1",
      "session-logger-combo-board-2": "q2",
      "session-logger-combo-board-3": "q3",
      "session-logger-combo-board-4": "q4",
    };
    return (
      <AppShell topNavMode="none" ambientPreset="logSet">
        <RegressionMarker scenario={scenario} />
        <ScrollScreenWithBottomActions>
          <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-3">
            <MeasurementComboBoard section={sectionByScenarioId[scenario.id]} />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </AppShell>
    );
  }

  const capturePerformedAt = new Date(Date.now() + 5000).toISOString();
  const selectedExerciseByScenarioId: Record<string, string | null> = {
    "active-workout-session-expanded": "session-ex-2",
    "session-logger-combo-board": null,
    "session-logger-strength-weight": "session-ex-1",
    "session-logger-bodyweight-reps": "session-ex-4",
    "session-logger-cardio-time": "session-ex-5",
    "session-logger-cardio-time-distance": "session-ex-3",
    "session-logger-cardio-distance": "session-ex-6",
    "session-logger-calories": "session-ex-7",
  };

  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
        <RegressionMarker scenario={scenario} />
        <SessionPageClient
          userId="dev-user"
          sessionId="dev-session"
        initialDurationSeconds={0}
          performedAt={capturePerformedAt}
          routineName={PREVIEW_ROUTINE_NAME}
          sessionDayName={PREVIEW_DAY_LABEL}
          sessionSummaryCounts={{ strength: 2, cardio: 1, bodyweight: 0, unknown: 0 }}
          unitLabel="lbs"
          exercises={mockSessionExercises}
        initialSelectedExerciseId={selectedExerciseByScenarioId[scenario.id] ?? null}
          saveSessionAction={noopActionResult}
          requestedReturnTo="/today"
              quickAddAction={<BottomDockButton type="button" intent="positive">Add</BottomDockButton>}
        addSetAction={noopSetAction}
        syncQueuedSetLogsAction={noopSyncQueuedSetLogsAction}
        toggleSkipAction={noopActionResult}
        removeExerciseAction={noopActionResult}
        deleteSetAction={noopActionResult}
        updateSessionExerciseProgressionAction={noopActionResult}
      />
    </AppShell>
  );
}

function renderRoutinesScenario(scenario: MobileFixtureScenario) {
  const activeRoutine = {
    id: "routine-1",
    name: PREVIEW_ROUTINE_NAME,
    summary: PREVIEW_ROUTINE_SUMMARY,
  } as const;
  const isListView = scenario.id === "routines-list-view";
  const previewDays = [
    { id: "preview-rd-1", dayIndex: 1, title: "Hunt", weekdayLabel: "Mon", isRest: false, exerciseCount: 8 },
    { id: "preview-rd-2", dayIndex: 2, title: "Forge", weekdayLabel: "Tue", isRest: false, exerciseCount: 8 },
    { id: "preview-rd-3", dayIndex: 3, title: "Rest", weekdayLabel: "Wed", isRest: true, exerciseCount: 0 },
  ];

  if (isListView) {
    return (
      <MainTabScreen topNavMode="none" ambientPreset="viewDay">
        <RegressionMarker scenario={scenario} />
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail>
              <RoutinesRouteHeaderCard
                title="Routines"
                subtitle="2 routines • Active routine pinned to Today"
              />
            </ContentRail>
          )}
        >
          <ContentRail className="space-y-3">
            <RoutinesPageClient
              newRoutineHref="/routines/new"
              routines={[
                {
                  id: "routine-1",
                  name: PREVIEW_ROUTINE_NAME,
                  summaryParts: ["16 exercises", "4 train", "1 rest", "5 workout plans"],
                  href: `/routines/${activeRoutine.id}`,
                  isActive: true,
                  previewDays,
                },
                {
                  id: "routine-2",
                  name: PREVIEW_SECONDARY_ROUTINE_NAME,
                  summaryParts: ["14 exercises", "4 train", "0 rest", "4 workout plans"],
                  href: "/routines/routine-2",
                  isActive: false,
                  previewDays: previewDays.slice(0, 2),
                },
              ]}
            />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail>
            <RoutinesRouteHeaderCard
              title={activeRoutine.name}
              subtitle={activeRoutine.summary}
              action={<AppBadge tone="success">ACTIVE</AppBadge>}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <RoutineHomeClient
            routineId={activeRoutine.id}
            routineStartDate="2026-04-21"
            isActiveRoutine
            appendRoutineDayAction={noopAppendDayAction}
            createRoutineDayAction={noopAppendDayAction}
            deleteRoutineDayAction={noopDeleteRoutineDayAction}
            reorderRoutineDaysAction={noopActionResult}
            days={[
              { id: "rd-1", dayIndex: 1, title: "Push", isRest: false, exerciseSummary: "3 strength • 1 cardio", notes: null, href: "#", isToday: false, isCompleted: true, isInSession: false, loggedSetCount: 0 },
              { id: "rd-2", dayIndex: 2, title: PREVIEW_DAY_LABEL, isRest: false, exerciseSummary: "2 strength • 1 cardio", notes: "Heavy compound focus with accessory finishers", href: "#", isToday: true, isCompleted: false, isInSession: false, loggedSetCount: 0 },
              { id: "rd-3", dayIndex: 3, title: "Recovery", isRest: true, exerciseSummary: "Recovery and mobility only", notes: null, href: "#", isToday: false, isCompleted: false, isInSession: false, loggedSetCount: 0 },
            ]}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderViewDayScenario(scenario: MobileFixtureScenario) {
  const isRestFixture = scenario.id === "view-day-rest";
  const isEmptyFixture = scenario.id === "view-day-empty";
  const viewDaySummary = isRestFixture
    ? getRestDayExerciseCountSummaryFromInputs([], true)
    : isEmptyFixture
      ? getRestDayExerciseCountSummaryFromInputs([], false)
      : { strength: 2, cardio: 1, bodyweight: 0, unknown: 0 };
  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail>
            <ScreenScaffold recipe="viewDay" className="w-full">
              <SharedScreenHeader
                recipe="viewDay"
                title={PREVIEW_ROUTINE_NAME}
                subtitle={<DayTaxonomyHeaderSummary dayName={isRestFixture ? "Recovery" : isEmptyFixture ? "Travel Reset" : PREVIEW_DAY_LABEL} summary={viewDaySummary} isRest={isRestFixture} includeDayName />}
                action={<TopRightBackButton href="/routines" ariaLabel="Back to routines" historyBehavior="fallback-only" />}
                align="center"
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail>
          <ScreenScaffold recipe="viewDay" className="w-full">
            {isRestFixture || isEmptyFixture ? (
              <SharedSectionShell
                recipe="viewDay"
                label={isRestFixture ? "Recovery plan" : "Day status"}
                context={isRestFixture ? "Recovery, mobility, or an easy walk fit here." : "Add exercises to this day to start a workout."}
                bodyClassName="space-y-2.5"
              >
                {isRestFixture ? (
                  <DayDetailStateCard
                    tone="rest"
                    title="Rest day"
                    body="Use this day for recovery, mobility, or an easy walk."
                  />
                ) : (
                  <DayDetailStateCard
                    tone="neutral"
                    title="No exercises planned"
                    body="Add exercises to this day to start a workout."
                  />
                )}
              </SharedSectionShell>
            ) : (
              <RoutineDayExerciseList
                exercises={[...mockViewDayExercises]}
              />
            )}
          </ScreenScaffold>
        </ContentRail>

        <PublishBottomActions>
          <BottomActionDock
            left={<RegressionDayRestToggleDockControl isRest={false} />}
            right={<BottomDockButton type="button" intent="positive">Edit</BottomDockButton>}
          />
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderEditDayScenario(scenario: MobileFixtureScenario) {
  const fixture = scenario.fixture as "default" | "reorder" | "empty" | "edit-exercise" | "add-exercise" | "card-parity";
  const editDayExercises = fixture === "empty"
    ? []
    : [
      {
        id: "edit-1",
        name: "Back Squat",
        summary: "4 sets x 5 reps @ 225 lbs",
        iconSrc: "/missing/icon-squat.png",
        orderNumber: 1,
        measurementType: "reps" as const,
        primary_muscle: "Quads",
        equipment: "Barbell",
        movement_pattern: "Squat",
      },
      {
        id: "edit-2",
        name: "Romanian Deadlift",
        summary: "3 sets x 8 reps @ 185 lbs",
        iconSrc: "/missing/icon-row.png",
        orderNumber: 2,
        measurementType: "reps" as const,
        primary_muscle: "Hamstrings",
        equipment: "Barbell",
        movement_pattern: "Hinge",
      },
      {
        id: "edit-3",
        name: "Walking Lunge",
        summary: LONG_GOAL_SUMMARY,
        iconSrc: "/missing/icon-lunge.png",
        orderNumber: 3,
        measurementType: "reps" as const,
        primary_muscle: "Glutes",
        equipment: "Dumbbell",
        movement_pattern: "Lunge",
      },
    ];
  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="editDay">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        floatingHeader={fixture === "edit-exercise" ? null : (
          <ContentRail className="py-1">
            <ScreenScaffold recipe="editDay" className="w-full">
              <SharedScreenHeader
                recipe="editDay"
                title={PREVIEW_DAY_LABEL}
                subtitle={<DayTaxonomyHeaderSummary dayName={fixture === "empty" ? "Travel Reset" : PREVIEW_DAY_LABEL} summary={fixture === "empty" ? getRestDayExerciseCountSummaryFromInputs([], false) : { strength: 2, cardio: 1, bodyweight: 0, unknown: 0 }} isRest={false} />}
                action={<TopRightBackButton href="/routines" ariaLabel="Back to day" historyBehavior="fallback-only" />}
              >
                {fixture === "reorder" ? (
                  <div className="w-full px-0.5">
                    <BottomDockButton type="button" intent="toggleActive" className="w-full">Done</BottomDockButton>
                  </div>
                ) : null}
              </SharedScreenHeader>
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <ScreenScaffold recipe="editDay" className="w-full">
            <EditDayRegressionSurface
              fixture={fixture}
              exercises={editDayExercises}
            />
          </ScreenScaffold>
        </ContentRail>

        <PublishBottomActions>
            {fixture === "edit-exercise" ? (
              <BottomActionDock
                left={<div />}
                right={<BottomDockButton type="button" intent="positive">Add Exercise</BottomDockButton>}
              />
            ) : (
              <BottomActionDock
                left={<RegressionDayRestToggleDockControl isRest={false} />}
                right={<BottomDockButton type="button" intent="positive">Add Exercise</BottomDockButton>}
              />
            )}
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}

function renderCreateRoutineScenario(scenario: MobileFixtureScenario) {
  return (
    <RoutineDetailsScreenShell backHref="/routines">
      <RegressionMarker scenario={scenario} />
      <div className="pointer-events-none">
        <NewRoutineDraftForm
          defaults={{
            name: PREVIEW_CREATE_ROUTINE_NAME,
            cycleLengthDays: 5,
            scheduleMode: "weekday_anchored",
            startDate: "2026-04-07",
            startWeekday: "monday",
            timezone: "America/New_York",
            weightUnit: "lbs",
            distanceUnit: "mi",
          }}
        />
      </div>
    </RoutineDetailsScreenShell>
  );
}

function renderEditRoutineScenario(scenario: MobileFixtureScenario) {
  return (
    <RoutineDetailsScreenShell backHref="/routines">
      <RegressionMarker scenario={scenario} />
      <div className="pointer-events-none">
        <EditRoutineAutosaveForm
          routineId="routine-1"
          existingStartDate="2026-04-07"
          returnHref="/routines"
          name={PREVIEW_ROUTINE_NAME}
          cycleLengthDays={5}
          scheduleMode="weekday_anchored"
          startDate="2026-04-07"
          startWeekday="monday"
          timezone="America/New_York"
          weightUnit="lbs"
        />
      </div>
    </RoutineDetailsScreenShell>
  );
}

function renderAddExerciseScenario(scenario: MobileFixtureScenario) {
  const isCustomTaxonomyFixture = scenario.id === "add-exercise-custom-taxonomy";

  return (
    <ExerciseChooserRouteScaffold
      recipe="sessionAddExercise"
      title={<RoutineDayHeaderTitle leadingItems={["Add Exercise to", PREVIEW_ROUTINE_NAME]} dayLabel={PREVIEW_DAY_LABEL} />}
      backHref="/session/dev-session"
      backAriaLabel="Back to session"
      headerAlign="center"
    >
      <RegressionMarker scenario={scenario} />
      <ExerciseChooserAddFlowForm
        formId="dev-add-exercise-regression-form"
        hiddenFields={{ sessionId: "dev-session" }}
        exercises={[...mockPickerExercises]}
        initialSelectedId={isCustomTaxonomyFixture ? EXERCISE_PICKER_CUSTOM_EXERCISE_ID : MOCK_EXERCISE_IDS.squat}
        initialCustomExerciseDraft={isCustomTaxonomyFixture ? {
          name: "Hip Flexor Stretch",
          primaryMuscle: "Recovery",
          secondaryMuscle: "Core",
          movementPattern: "Stretch",
          equipment: "Bodyweight",
        } : undefined}
        weightUnit="lbs"
        defaultProgressionPlaybookId={null}
        defaultProgressionPlaybookConfig={null}
        exerciseStats={[]}
        customExerciseEnabled
        backHref="/session/dev-session"
        addExerciseAction={noopActionResult}
        successMessage="Exercise added to session."
        errorMessage="Could not add exercise."
      />
    </ExerciseChooserRouteScaffold>
  );
}

function renderHistorySessionsScenario(scenario: MobileFixtureScenario) {
  const initialViewMode = scenario.fixture === "detailed" ? "detailed" : "compact";

  return (
    <MainTabScreen topNavMode="none" ambientPreset="history">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={<ContentRail><HistoryPageHeader title="Sessions" subtitle={`${mockHistorySessions.length} logged`} /></ContentRail>}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <HistorySessionsClient
            sessions={[...mockHistorySessions]}
            currentRoutineSessions={[...mockHistorySessions]}
            currentCycleSessions={[...mockHistorySessions]}
            activeRoutineTitle={mockHistoryWeeklyProgress.primaryRoutineTitle}
            scopeSummary={mockHistoryScopeSummary}
            currentRoutineScopeSummary={{
              ...mockHistoryScopeSummary,
              scopeLabel: mockHistoryWeeklyProgress.primaryRoutineTitle
                ? `Current Routine: ${mockHistoryWeeklyProgress.primaryRoutineTitle}`
                : "Current Routine",
            }}
            currentCycleScopeSummary={{
              ...mockHistoryScopeSummary,
              scopeLabel: "Current Cycle: Apr 6 - Apr 12",
            }}
            weeklyProgress={mockHistoryWeeklyProgress}
            currentRoutineWeeklyProgress={mockHistoryWeeklyProgress}
            currentCycleWeeklyProgress={mockHistoryWeeklyProgress}
            weeklyProgressByWeek={[mockHistoryWeeklyProgress]}
            currentRoutineWeeklyProgressByWeek={[mockHistoryWeeklyProgress]}
            currentCycleWeeklyProgressByWeek={[mockHistoryWeeklyProgress]}
            selectedSessionId="history-session-2"
            initialViewMode={initialViewMode}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderHistoryProgressionScenario(scenario: MobileFixtureScenario) {
  const model = scenario.fixture === "filtered"
    ? mockFilteredProgressionHistoryDisplayModel
    : mockProgressionHistoryDisplayModel;

  return (
    <HistoryRouteScaffold
      mode="overview"
      title="Progression"
      subtitle="Durable ledger of applied target changes"
      activeTab="progression"
    >
      <RegressionMarker scenario={scenario} />
      <ProgressionHistorySurface {...model} />
    </HistoryRouteScaffold>
  );
}

function renderHistoryExercisesScenario(scenario: MobileFixtureScenario) {
  const initialViewMode = scenario.fixture === "detailed" ? "detailed" : "compact";
  const rows = scenario.id === "history-exercises-cardio-taxonomy"
    ? [mockHistoryExerciseRows[0]]
    : scenario.id === "history-exercises-media-fallback"
      ? [mockHistoryExerciseRows[1]]
      : [...mockHistoryExerciseRows];

  return (
    <MainTabScreen topNavMode="none" ambientPreset="history">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={<ContentRail className="py-1"><div id="history-exercises-floating-header" /></ContentRail>}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <ExerciseBrowserClient initialRows={rows} inlineHeaderControls initialViewMode={initialViewMode} />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderHistoryDetailScenario(scenario: MobileFixtureScenario) {
  const initialExpandedExerciseId = scenario.fixture === "progression-expanded"
    ? "audit-1"
    : scenario.fixture === "long-metrics"
      ? "audit-3"
      : null;
  const exercises = scenario.fixture === "long-metrics"
    ? mockHistoryDetailLongMetricExercises
    : mockHistoryDetailExercises;
  const exerciseNameMap: Record<string, string> = scenario.fixture === "long-metrics"
    ? {
        [MOCK_EXERCISE_IDS.pullup]: "Weighted Pull-Up",
        [MOCK_EXERCISE_IDS.row]: "Chest-Supported Row",
      }
    : {
        [MOCK_EXERCISE_IDS.squat]: "Back Squat",
        [MOCK_EXERCISE_IDS.walk]: "Incline Walk",
      };

  return (
    <AppShell className="gap-4" topNavMode="none" ambientPreset="history">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        floatingHeader={<ContentRail><div id="history-log-floating-header" /></ContentRail>}
        className="flex flex-col gap-3"
      >
        <ContentRail>
          <ScreenScaffold className="space-y-2">
            <HistoryLogPageClient
              logId="history-session-2"
              initialDayName={PREVIEW_DAY_LABEL}
              initialNotes="Broken media fixtures should preserve spacing and not collapse summary rows."
              unitLabel="lbs"
              exerciseNameMap={exerciseNameMap}
              sessionSummary={mockHistorySessions[1]}
              backHref="/history?tab=sessions"
              exercises={[...exercises]}
              initialExpandedExerciseId={initialExpandedExerciseId}
            />
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}

function renderSettingsScenario(scenario: MobileFixtureScenario) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className={appTokens.settingsFloatingHeaderRail}>
            <SurfaceCard dense className="px-4 py-3">
              <SettingsHeaderIdentity
                email="dev-regression@example.com"
                username="dev-regression"
              />
            </SurfaceCard>
          </ContentRail>
        )}
      >
        <ContentRail className={appTokens.settingsContentRail}>
          <SurfaceCard>
            <SettingsScreenStateProvider initialExpandedSection={scenario.fixture === "data-export" ? "data" : null}>
              <div className="pointer-events-none">
                <SettingsAccordionClient
                  email="dev-regression@example.com"
                  username="dev-regression"
                  legacyBridgeConfigured={false}
                  userKind="human"
                  userNumber={null}
                  canAccessQaVisibilitySetting={false}
                  showQaLlelData={false}
                  initialExportDateFrom="2026-05-01"
                  initialExportDateTo="2026-05-09"
                />
              </div>
            </SettingsScreenStateProvider>
          </SurfaceCard>
        </ContentRail>

        <div className="pointer-events-none">
          <PublishBottomActions>
            <BottomActionSingle>
              <button
                type="button"
                className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
              >
                Export
              </button>
            </BottomActionSingle>
          </PublishBottomActions>
        </div>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function getRegressionExerciseDetailFixture(scenario: MobileFixtureScenario) {
  if (scenario.id === "exercise-detail-cardio" || scenario.id === "exercise-detail-long-scroll") {
    const isLongScrollFixture = scenario.id === "exercise-detail-long-scroll";
    return {
      exercise: {
        id: MOCK_EXERCISE_IDS.walk,
        name: isLongScrollFixture ? "Incline Walk With Long-Scroll Bottom Reach Audit" : "Incline Walk",
        primary_muscle: "Cardio",
        equipment: "Treadmill",
        movement_pattern: "Gait",
        image_howto_path: "/missing/howto-walk.png",
        image_icon_path: "/missing/icon-walk.png",
        slug: "incline-walk",
        how_to_short: isLongScrollFixture
          ? longExerciseInfoHowTo
          : "Keep posture tall, let the incline drive the effort, and settle into a repeatable pace.",
      },
      stats: {
        kind: "cardio" as const,
        presentationKind: "cardio" as const,
        recent: {
          lastPerformedAt: "2026-04-09T13:00:00.000Z",
          lastSummary: "24m | 1.85 mi | 12:58/mi",
          lastDurationSeconds: 1440,
          lastDistance: 1.85,
          lastCalories: 286,
          lastPaceSecondsPerUnit: 778,
          lastDistanceUnit: "mi" as const,
        },
        totals: {
          sessions: 14,
          sets: 14,
          durationSeconds: 18640,
          distance: 21.7,
          calories: 3120,
        },
        bests: {
          bestSetSummary: "31m | 2.35 mi | 13:11/mi",
          bestDurationSeconds: 1860,
          bestDistance: 2.35,
          bestPace: 791,
          bestDistanceUnit: "mi" as const,
          bestCalories: 364,
        },
        prLabel: "",
        prCount: 0,
        quickMetrics: [
          { label: "Last", value: "Wed, Apr 9", timeframe: "24m | 1.85 mi | 12:58/mi" },
          { label: "Best", value: "31m | 2.35 mi | 13:11/mi" },
          { label: "PRs", value: "0", timeframe: "Pace tracking live" },
          { label: "Sessions", value: "14", timeframe: "14 sets logged" },
        ],
        performanceMetrics: [
          { label: "Best Pace", value: "12:58/mi" },
          { label: "Longest Distance", value: "2.35 mi" },
          { label: "Longest Time", value: "31m" },
        ],
        progress: {
          metrics: [
            { label: "Vs Previous", value: "+0.20 mi" },
            { label: "30D Frequency", value: "5 sessions", timeframe: "last 30 days" },
          ],
          performances: [
            { label: "Wed, Apr 9", value: "24m | 1.85 mi | 12:58/mi", context: "1 set" },
            { label: "Mon, Apr 7", value: "22m | 1.65 mi | 13:20/mi", context: "1 set" },
            { label: "Thu, Apr 3", value: "31m | 2.35 mi | 13:11/mi", context: "1 set" },
          ],
        },
      },
    };
  }

  if (scenario.id === "exercise-detail-bodyweight") {
    return {
      exercise: {
        id: MOCK_EXERCISE_IDS.pullup,
        name: "Pull-Up",
        primary_muscle: "Back",
        equipment: "Pull-Up Bar",
        movement_pattern: "Vertical Pull",
        image_howto_path: "/missing/howto-pullup.png",
        image_icon_path: "/missing/icon-pullup.png",
        slug: "pull-up",
        how_to_short: "Start from a dead hang, keep the ribs tucked, and drive the elbows down before the chin clears the bar.",
      },
      stats: {
        kind: "strength" as const,
        presentationKind: "bodyweight" as const,
        recent: {
          lastPerformedAt: "2026-04-08T13:00:00.000Z",
          lastSummary: "9 reps",
        },
        totals: {
          sessions: 12,
          sets: 36,
          reps: 248,
        },
        bests: {
          bestBodyweightReps: 12,
          bestWeight: 25,
          bestRepsAtBestWeight: 5,
          bestSetSummary: "12 reps",
        },
        prLabel: "Rep PR",
        prCount: 1,
        quickMetrics: [
          { label: "Last", value: "Tue, Apr 8", timeframe: "9 reps" },
          { label: "Best Set", value: "12 reps" },
          { label: "PRs", value: "1", timeframe: "Rep PR" },
          { label: "Sessions", value: "12", timeframe: "36 sets logged" },
        ],
        performanceMetrics: [
          { label: "Best Reps", value: "12 reps" },
          { label: "Added Load", value: "25 lbs" },
        ],
        progress: {
          metrics: [
            { label: "Vs Previous", value: "+1 rep" },
            { label: "30D Frequency", value: "5 sessions", timeframe: "last 30 days" },
          ],
          performances: [
            { label: "Tue, Apr 8", value: "9 reps", context: "4 sets" },
            { label: "Sat, Apr 5", value: "8 reps", context: "4 sets" },
            { label: "Tue, Apr 1", value: "12 reps", context: "5 sets" },
          ],
        },
      },
    };
  }

  if (scenario.id === "exercise-detail-weighted-strength" || scenario.id === "exercise-detail-weighted-strength-long-target") {
    const isLongTargetStressScenario = scenario.id === "exercise-detail-weighted-strength-long-target";

    return {
      exercise: {
        id: MOCK_EXERCISE_IDS.bench,
        name: "Dumbbell Bench Press",
        primary_muscle: "Chest",
        equipment: "Dumbbell",
        movement_pattern: "Horizontal Push",
        image_howto_path: "/missing/howto-bench.png",
        image_icon_path: "/missing/icon-bench.png",
        slug: "dumbbell-bench-press",
        how_to_short: "Set the shoulder blades, keep the forearms stacked, and press both dumbbells through the same bar path every rep.",
      },
      stats: {
        kind: "strength" as const,
        presentationKind: "strength" as const,
        recent: {
          lastPerformedAt: "2026-06-08T13:00:00.000Z",
          lastSummary: "225 lbs x 5",
        },
        totals: {
          sessions: 22,
          sets: 66,
          reps: 318,
        },
        bests: {
          bestWeight: 245,
          bestRepsAtBestWeight: 4,
          bestSetSummary: "245 lbs x 4",
        },
        prLabel: "Load PR",
        prCount: 3,
        quickMetrics: [
          { label: "Last", value: "Sun, Jun 8", timeframe: "225 lbs x 5" },
          { label: "Best Set", value: "245 lbs x 4" },
          { label: "PRs", value: "3", timeframe: "Load PRs" },
          { label: "Sessions", value: "22", timeframe: "66 sets logged" },
        ],
        surfaceMetrics: [
          { label: "Sessions", value: "22" },
          { label: "Sets", value: "66" },
          { label: "Last", value: "5 reps | 225 lbs" },
          { label: "Best", value: "4 reps | 245 lbs" },
        ],
        performanceMetrics: [
          { label: "Best Weight", value: "245 lbs" },
          { label: "Best Reps", value: "11 reps" },
          { label: "Top Set", value: "245 lbs x 4" },
          { label: "Max Estimate", value: "278 lbs" },
        ],
        progress: {
          metrics: [
            { label: "Vs Previous", value: "+1 rep" },
            { label: "30D", value: "6 sessions" },
            { label: "Last", value: "5 reps | 225 lbs" },
            { label: "Best", value: "11 reps | 225 lbs" },
          ],
          reviewSections: [
            { title: "Progress", items: ["Matched target load.", "1 Rep PR landed this week."] },
            { title: "PR History", items: ["Rep PR | 225 lbs | Jun 8", "Load PR | 245 lbs | May 17"] },
          ],
          performances: [
            { label: "Jun 8", value: "225 lbs x 5", context: "3 sets" },
            { label: "Jun 4", value: "225 lbs x 4", context: "3 sets" },
            { label: "May 29", value: "245 lbs x 4", context: "4 sets" },
          ],
        },
        progression: {
          eventCount: 3,
          promotionCount: 1,
          deloadCount: 0,
          manualChangeCount: 1,
          revertCount: 0,
          lockInCount: 1,
          linkedSessionCount: 2,
          distinctExerciseCount: 1,
          firstChangeAt: "2026-05-14T11:00:00.000Z",
          latestChangeAt: "2026-06-08T13:00:00.000Z",
          lastPromotionAt: "2026-06-08T13:00:00.000Z",
          firstTargetLabel: isLongTargetStressScenario ? "4 reps | 225 lbs | 2 sec pause" : "4 reps | 225 lbs",
          currentTargetLabel: isLongTargetStressScenario ? "5 reps | 225 lbs | 2 sec pause" : "5 reps | 225 lbs",
          latestChangeSummary: isLongTargetStressScenario
            ? "Reps increased | 4 reps | 225 lbs | 2 sec pause -> 5 reps | 225 lbs | 2 sec pause"
            : "Reps increased | 4 reps | 225 lbs -> 5 reps | 225 lbs",
          latestEventLabel: "Promotion applied",
          timelineSummary: isLongTargetStressScenario
            ? "4 reps | 225 lbs | 2 sec pause -> 5 reps | 225 lbs | 2 sec pause"
            : "4 reps | 225 lbs -> 5 reps | 225 lbs",
          recentWindowDays: 30,
          recentEventCount: 2,
          recentPromotionCount: 1,
          recentDeloadCount: 0,
          recentManualChangeCount: 1,
          recentActivitySummary: isLongTargetStressScenario
            ? "2 updates | 1 promotion | 1 manual pause-target change"
            : "2 updates | 1 promotion | 1 manual change",
          recentFocusSummary: "1 promotion led recent changes",
          chartSections: [
            {
              id: "progression-activity",
              title: "Progression Activity",
              description: "How progression changes stacked across the current week.",
              emptyTitle: "No progression activity yet.",
              emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
              bars: [
                {
                  id: "2026-05-28",
                  label: "May 28",
                  value: 1,
                  valueLabel: "1 event",
                  detail: "1 change landed.",
                },
                {
                  id: "2026-06-08",
                  label: "Jun 8",
                  value: 1,
                  valueLabel: "1 event",
                  detail: "1 change landed.",
                },
              ],
            },
            {
              id: "progression-event-mix",
              title: "Change Mix",
              description: "Which change types are driving the visible progression slice.",
              emptyTitle: "No change mix yet.",
              emptyCaption: "The mix appears after the first progression event is recorded.",
              bars: [
                {
                  id: "promotion_applied",
                  label: "Promotion",
                  value: 1,
                  valueLabel: "1 event",
                  detail: null,
                },
                {
                  id: "manual_target_change",
                  label: "Manual change",
                  value: 1,
                  valueLabel: "1 event",
                  detail: null,
                },
              ],
            },
            {
              id: "progression-hotspots",
              title: "Promotion Hotspots",
              description: "Exercises with the most promotions in the visible progression slice.",
              emptyTitle: "No promotion hotspots yet.",
              emptyCaption: "Promotion hotspots appear after the first applied promotion lands.",
              bars: [
                {
                  id: "dumbbell-bench-press",
                  label: "Dumbbell Bench Press",
                  value: 1,
                  valueLabel: "1 promotion",
                  detail: null,
                },
              ],
            },
          ],
          lifelineItems: [
            isLongTargetStressScenario
              ? "Latest: Reps increased | 4 reps | 225 lbs | 2 sec pause -> 5 reps | 225 lbs | 2 sec pause"
              : "Latest: Reps increased | 4 reps | 225 lbs -> 5 reps | 225 lbs",
            isLongTargetStressScenario
              ? "Target Path: 4 reps | 225 lbs | 2 sec pause -> 5 reps | 225 lbs | 2 sec pause"
              : "Target Path: 4 reps | 225 lbs -> 5 reps | 225 lbs",
            isLongTargetStressScenario
              ? "Recent activity: 2 updates | 1 promotion | 1 manual pause-target change"
              : "Recent activity: 2 updates | 1 promotion | 1 manual change",
          ],
          activityDays: [
            {
              id: "2026-06-08",
              label: "Jun 8",
              detail: "1 change landed.",
              valueLabel: "1 event",
              eventCount: 1,
              promotionCount: 1,
              deloadCount: 0,
              manualChangeCount: 0,
              revertCount: 0,
              items: [isLongTargetStressScenario
                ? "Promotion applied | Reps increased | 4 reps | 225 lbs | 2 sec pause -> 5 reps | 225 lbs | 2 sec pause"
                : "Promotion applied | Reps increased | 4 reps | 225 lbs -> 5 reps | 225 lbs"],
            },
            {
              id: "2026-05-28",
              label: "May 28",
              detail: "1 change landed.",
              valueLabel: "1 event",
              eventCount: 1,
              promotionCount: 0,
              deloadCount: 0,
              manualChangeCount: 1,
              revertCount: 0,
              items: [isLongTargetStressScenario
                ? "Manual target change | Pause target adjusted | 4 reps | 225 lbs | 1 sec pause -> 4 reps | 225 lbs | 2 sec pause"
                : "Manual target change | Load adjusted | 4 reps | 220 lbs -> 4 reps | 225 lbs"],
            },
          ],
        },
      },
    };
  }

  return {
    exercise: {
      id: MOCK_EXERCISE_IDS.squat,
      name: "Back Squat",
      primary_muscle: "Quads",
      equipment: "Barbell",
      movement_pattern: "Squat",
      image_howto_path: "/missing/howto-squat.png",
      image_icon_path: "/missing/icon-squat.png",
      slug: "back-squat",
      how_to_short: "Brace hard, stay rooted through the whole foot, and drive the bar straight up through the mid-foot.",
    },
    stats: {
      kind: "strength" as const,
      presentationKind: "strength" as const,
      recent: {
        lastPerformedAt: "2026-04-09T13:00:00.000Z",
        lastSummary: "225 lbs x 5",
      },
      totals: {
        sessions: 14,
        sets: 42,
        reps: 168,
      },
      bests: {
        bestWeight: 275,
        bestRepsAtBestWeight: 3,
        bestSetSummary: "275 lbs x 3",
      },
      prLabel: "Load PR",
      prCount: 1,
      quickMetrics: [
          { label: "Last", value: "Wed, Apr 9", timeframe: "225 lbs x 5" },
          { label: "Best Set", value: "275 lbs x 3" },
        { label: "PRs", value: "1", timeframe: "Load PR" },
        { label: "Sessions", value: "14", timeframe: "42 sets logged" },
      ],
      performanceMetrics: [
          { label: "Best Weight", value: "275 lbs" },
          { label: "Best Reps", value: "10 reps" },
          { label: "Top Set", value: "275 lbs x 3" },
          { label: "Max Estimate", value: "303 lbs" },
      ],
      progress: {
        metrics: [
          { label: "Vs Previous", value: "+10 lbs" },
          { label: "30D Frequency", value: "6 sessions", timeframe: "last 30 days" },
        ],
        performances: [
          { label: "Wed, Apr 9", value: "225 lbs x 5", context: "4 sets" },
          { label: "Mon, Apr 7", value: "220 lbs x 5", context: "4 sets" },
          { label: "Thu, Apr 3", value: "275 lbs x 3", context: "5 sets" },
        ],
      },
    },
  };
}

function renderExerciseDetailScenario(scenario: MobileFixtureScenario) {
  const fixture = getRegressionExerciseDetailFixture(scenario);

  return (
    <RegressionExerciseInfoSheet
      scenarioId={scenario.id}
      scrollToBottom={scenario.captureScrollPosition === "bottom"}
      exercise={fixture.exercise}
      stats={fixture.stats}
    />
  );
}

function renderScenario(scenario: MobileFixtureScenario) {
  traceMobileRegression("render", {
    scenarioId: scenario.id,
    resolvedScreen: scenario.screen,
    resolvedFixture: scenario.fixture,
    componentChosen: getRegressionRenderBoundary(scenario.route),
    firstRenderBoundaryEntered: getRegressionRenderBoundary(scenario.route),
  });

  switch (scenario.route) {
    case "today":
      return renderTodayScenario(scenario);
    case "session":
      return renderSessionScenario(scenario);
    case "routines":
      return renderRoutinesScenario(scenario);
    case "viewDay":
      return renderViewDayScenario(scenario);
    case "editDay":
      return renderEditDayScenario(scenario);
    case "createRoutine":
      return renderCreateRoutineScenario(scenario);
    case "editRoutine":
      return renderEditRoutineScenario(scenario);
    case "addExercise":
      return renderAddExerciseScenario(scenario);
    case "historySessions":
      return renderHistorySessionsScenario(scenario);
    case "historyProgression":
      return renderHistoryProgressionScenario(scenario);
    case "historyExercises":
      return renderHistoryExercisesScenario(scenario);
    case "historyDetail":
      return renderHistoryDetailScenario(scenario);
    case "settings":
      return renderSettingsScenario(scenario);
    case "exerciseDetail":
      return renderExerciseDetailScenario(scenario);
    default:
      notFound();
  }
}

export default function DevMobileRegressionPage({
  searchParams,
}: {
  searchParams?: {
    scenario?: string;
    screen?: string;
    fixture?: string;
  };
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const scenario = resolveMobileRegressionScenario({
    scenario: searchParams?.scenario,
    screen: searchParams?.screen,
    fixture: searchParams?.fixture,
  });

  if (!searchParams?.scenario && !searchParams?.screen && !searchParams?.fixture) {
    return <RegressionIndex />;
  }

  if (!scenario) {
    traceMobileRegression("resolve-miss", {
      requestedScenario: searchParams?.scenario ?? null,
      requestedScreen: searchParams?.screen ?? null,
      requestedFixture: searchParams?.fixture ?? null,
    });
    notFound();
  }

  traceMobileRegression("resolve", {
    requestedScenario: searchParams?.scenario ?? null,
    requestedScreen: searchParams?.screen ?? null,
    requestedFixture: searchParams?.fixture ?? null,
    resolvedScenario: scenario.id,
    resolvedScreen: scenario.screen,
    resolvedFixture: scenario.fixture,
    componentChosen: getRegressionRenderBoundary(scenario.route),
  });

  return (
    <>
      <RegressionBodyFlag />
      {renderScenario(scenario)}
    </>
  );
}
