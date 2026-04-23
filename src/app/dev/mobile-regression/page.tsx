import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditDayRegressionSurface } from "@/app/dev/mobile-regression/EditDayRegressionSurface";
import { RegressionBodyFlag } from "@/app/dev/mobile-regression/RegressionBodyFlag";
import { RegressionExerciseInfoSheet } from "@/app/dev/mobile-regression/RegressionExerciseInfoSheet";
import { RegressionDayRestToggleDockControl } from "@/app/dev/mobile-regression/RegressionDayRestToggleDockControl";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { HistorySessionsClient } from "@/app/history/HistorySessionsClient";
import { ExerciseBrowserClient } from "@/app/history/exercises/ExerciseBrowserClient";
import { HistoryLogPageClient } from "@/app/history/[sessionId]/HistoryLogPageClient";
import { NewRoutineDraftForm } from "@/app/routines/new/NewRoutineDraftForm";
import { EditRoutineAutosaveForm } from "@/app/routines/[id]/edit/EditRoutineAutosaveForm";
import { SessionPageClient } from "@/components/SessionPageClient";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomActionDock } from "@/components/layout/BottomActionDock";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { ActiveRoutineStatusBadge, ActiveRoutineSummaryCard } from "@/components/routines/RoutinesScreenFamily";
import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { HistoryPageHeader } from "@/components/history/HistoryShared";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AccountSettingsForm } from "@/components/settings/AccountSettingsForm";
import { GlassEffectsSettings } from "@/components/settings/GlassEffectsSettings";
import {
  mobileRegressionScenarios,
  resolveMobileRegressionScenario,
  type MobileRouteKey,
  type MobileFixtureScenario,
} from "@/features/mobile-regression/fixtures";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";

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

const MOCK_EXERCISE_IDS = {
  squat: "11111111-1111-4111-8111-111111111111",
  lunge: "22222222-2222-4222-8222-222222222222",
  bench: "33333333-3333-4333-8333-333333333333",
  row: "44444444-4444-4444-8444-444444444444",
  walk: "55555555-5555-4555-8555-555555555555",
  pullup: "66666666-6666-4666-8666-666666666666",
  plank: "77777777-7777-4777-8777-777777777777",
} as const;

async function noopRoutineSwitchAction(_: FormData) {
  "use server";
}

async function noopActionResult(_: unknown) {
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
  return <div hidden data-mobile-regression-id={scenario.id} data-mobile-regression-screen={scenario.screen} />;
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
    default_unit: "sec",
    calories_estimation_method: null,
    image_howto_path: "/missing/howto-plank.png",
    image_icon_path: "/missing/icon-plank.png",
    how_to_short: "Squeeze glutes, keep ribs down, and push the floor away.",
    slug: "plank",
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
        targets: "4 sets x 6 reps @ 185 lb",
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
        targets: "4 sets x 5 reps @ 225 lb",
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
        name: "Walking Lunge With Very Long Accessory Naming For Wrapping Proof",
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
    goalLine: "4 sets x 5 reps @ 225 lb",
    exerciseId: MOCK_EXERCISE_IDS.squat,
    image_icon_path: "/missing/icon-squat.png",
    image_howto_path: "/missing/howto-squat.png",
    slug: "back-squat",
  },
  {
    id: "view-2",
    name: "Walking Lunge With Very Long Accessory Naming For Wrapping Proof",
    goalLine: LONG_GOAL_SUMMARY,
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
    goalLabel: "4 sets x 5 reps @ 225 lb",
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
];

const mockHistorySessions = [
  {
    id: "history-session-1",
    startedAt: "2026-04-09T13:00:00.000Z",
    routineTitle: "Upper A",
    dayTitle: "Day 2",
    durationSec: 3120,
    exerciseCount: 6,
    setCount: 18,
    prCounts: { reps: 0, weight: 1, total: 1 },
    prLabel: "1 PR",
    topSet: { exerciseName: "Bench Press", display: "205 lb x 4" },
    bestLift: { exerciseName: "Bench Press", display: "205 lb x 4" },
    totalVolume: 6820,
    completionRate: 1,
    hasNote: false,
    hasSetData: true,
  },
  {
    id: "history-session-2",
    startedAt: "2026-04-07T13:00:00.000Z",
    routineTitle: "Lower B With An Extra Long Historical Title For Density Checks",
    dayTitle: "Day 5",
    durationSec: 3660,
    exerciseCount: 7,
    setCount: 24,
    prCounts: { reps: 1, weight: 1, total: 3 },
    prLabel: "3 PRs",
    topSet: { exerciseName: "Back Squat", display: "275 lb x 3" },
    bestLift: { exerciseName: "Back Squat", display: "275 lb x 3" },
    totalVolume: 11340,
    completionRate: 0.86,
    hasNote: true,
    hasSetData: true,
  },
  {
    id: "history-session-3",
    startedAt: "2026-04-05T13:00:00.000Z",
    routineTitle: "Conditioning",
    dayTitle: "Intervals",
    durationSec: 2280,
    exerciseCount: 4,
    setCount: 12,
    prCounts: { reps: 0, weight: 0, total: 0 },
    prLabel: "",
    totalVolume: 0,
    completionRate: 0.75,
    hasNote: false,
    hasSetData: false,
  },
];

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

function renderTodayScenario(scenario: MobileFixtureScenario) {
  const selectedDayIndex = scenario.id === "today-rest"
    ? 3
    : scenario.id === "today-empty"
      ? 4
      : 2;
  const selectedDay = mockTodayDays.find((day) => day.dayIndex === selectedDayIndex) ?? mockTodayDays[1];
  const exerciseDensity = scenario.id === "today-detailed" ? "detailed" : "compact";

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
                  title="Lower Rotation"
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
                      targets: "4 sets x 5 reps @ 225 lb",
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
            routineName="Lower Rotation"
            floatingHeaderSlotId="today-floating-header-slot"
            exerciseDensity={exerciseDensity}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderSessionScenario(scenario: MobileFixtureScenario) {
  const capturePerformedAt = new Date(Date.now() + 5000).toISOString();

  return (
    <AppShell topNavMode="none" ambientPreset="logSet">
        <RegressionMarker scenario={scenario} />
        <SessionPageClient
          userId="dev-user"
          sessionId="dev-session"
        initialDurationSeconds={0}
        performedAt={capturePerformedAt}
        routineName="Lower Rotation"
        sessionDayName="Day 2"
        sessionSummaryCounts={{ strength: 2, cardio: 1, unknown: 0 }}
        unitLabel="lbs"
        exercises={mockSessionExercises}
        initialSelectedExerciseId={scenario.id === "active-workout-session-expanded" ? "session-ex-2" : null}
        saveSessionAction={noopActionResult}
        requestedReturnTo="/today"
            quickAddAction={<BottomDockButton type="button" intent="positive">Add</BottomDockButton>}
        addSetAction={noopSetAction}
        syncQueuedSetLogsAction={noopSyncQueuedSetLogsAction}
        toggleSkipAction={noopActionResult}
        removeExerciseAction={noopActionResult}
        deleteSetAction={noopActionResult}
      />
    </AppShell>
  );
}

function renderRoutinesScenario(scenario: MobileFixtureScenario) {
  const activeRoutine = {
    id: "routine-1",
    name: "Lower Rotation",
    summary: "5 days \u2022 4 training \u2022 1 rest \u2022 16 exercises",
  } as const;
  const isListView = scenario.id === "routines-list-view";

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail>
            <ActiveRoutineSummaryCard
              title="Lower Rotation"
              metadata="4 training • 1 rest"
              status={<ActiveRoutineStatusBadge active />}
            />
          </ContentRail>
        )}
      >
        <ContentRail className="space-y-3">
          <RoutinesPageClient
            activeRoutineId={isListView ? null : activeRoutine.id}
            activeRoutineName={isListView ? null : activeRoutine.name}
            activeRoutineSummary={isListView ? null : activeRoutine.summary}
            activeRoutineStartDate={isListView ? null : "2026-04-21"}
            activeRoutineEditHref={isListView ? null : `/routines/${activeRoutine.id}/edit`}
            newRoutineHref="/routines/new"
            initialRoutineListOpen={isListView}
            setActiveRoutineAction={noopRoutineSwitchAction}
            routines={[
              { id: "routine-1", name: "Lower Rotation", summary: "5 days • 4 training • 1 rest • 16 exercises" },
              { id: "routine-2", name: "Upper Density Block", summary: "4 days • 4 training • 0 rest • 14 exercises" },
            ]}
            days={[
              { id: "rd-1", dayIndex: 1, title: "Push", isRest: false, exerciseSummary: "3 strength • 1 cardio", notes: null, href: "#", isToday: false, isCompleted: true, isInSession: false, loggedSetCount: 0 },
              { id: "rd-2", dayIndex: 2, title: "Lower", isRest: false, exerciseSummary: "2 strength • 1 cardio", notes: "Long accessory block", href: "#", isToday: true, isCompleted: false, isInSession: false, loggedSetCount: 0 },
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
      : { strength: 2, cardio: 1, unknown: 0 };
  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail>
            <ScreenScaffold recipe="viewDay" className="w-full">
              <SharedScreenHeader
                recipe="viewDay"
                title="Lower Rotation"
                subtitle={<DayTaxonomyHeaderSummary dayName={isRestFixture ? "Recovery" : isEmptyFixture ? "Travel Reset" : "Lower"} summary={viewDaySummary} isRest={isRestFixture} />}
                action={<TopRightBackButton href="/routines" ariaLabel="Back to routines" historyBehavior="fallback-only" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail>
          <ScreenScaffold recipe="viewDay" className="w-full">
            <SharedSectionShell recipe="viewDay" bodyClassName="space-y-3">
              {isRestFixture ? (
                <DayDetailStateCard
                  tone="rest"
                  title="Rest day"
                  body="Use this day for recovery, mobility, or an easy walk."
                />
              ) : isEmptyFixture ? (
                <DayDetailStateCard
                  tone="neutral"
                  title="No exercises planned"
                  body="Add exercises to this day to start a workout."
                />
              ) : (
                <RoutineDayExerciseList
                  exercises={[...mockViewDayExercises]}
                />
              )}
            </SharedSectionShell>
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
  const fixture = scenario.fixture as "default" | "reorder" | "rest" | "empty" | "edit-exercise" | "add-exercise" | "card-parity";
  const editDayExercises = fixture === "empty"
    ? []
    : [
      {
        id: "edit-1",
        name: "Back Squat",
        summary: "4 sets x 5 reps @ 225 lb",
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
        summary: "3 sets x 8 reps @ 185 lb",
        iconSrc: "/missing/icon-row.png",
        orderNumber: 2,
        measurementType: "reps" as const,
        primary_muscle: "Hamstrings",
        equipment: "Barbell",
        movement_pattern: "Hinge",
      },
      {
        id: "edit-3",
        name: "Walking Lunge With Very Long Accessory Naming For Wrapping Proof",
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
        floatingHeader={(
          <ContentRail className="py-1">
            <ScreenScaffold recipe="editDay" className="w-full">
              <SharedScreenHeader
                recipe="editDay"
                title="Lower"
                subtitle={<DayTaxonomyHeaderSummary dayName={fixture === "rest" ? "Recovery" : fixture === "empty" ? "Travel Reset" : "Lower"} summary={fixture === "rest" ? getRestDayExerciseCountSummaryFromInputs([], true) : fixture === "empty" ? getRestDayExerciseCountSummaryFromInputs([], false) : { strength: 2, cardio: 1, unknown: 0 }} isRest={fixture === "rest"} />}
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
          {fixture === "rest" ? (
            <BottomActionSingle>
              <RegressionDayRestToggleDockControl isRest />
            </BottomActionSingle>
          ) : fixture === "edit-exercise" ? (
            <BottomActionDock
              left={<BottomDockButton type="button" intent="info">View</BottomDockButton>}
              right={<BottomDockButton type="button" intent="danger">Delete</BottomDockButton>}
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
            name: "Starter Split With Long Name Preview",
            cycleLengthDays: 5,
            startWeekday: "monday",
            timezone: "America/New_York",
            weightUnit: "lbs",
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
          name="Lower Rotation"
          cycleLengthDays={5}
          startWeekday="monday"
          timezone="America/New_York"
          weightUnit="lbs"
          deleteAction={<BottomDockButton type="button" intent="danger">Delete</BottomDockButton>}
        />
      </div>
    </RoutineDetailsScreenShell>
  );
}

function renderAddExerciseScenario(scenario: MobileFixtureScenario) {
  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="logSet">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ContentRail className="py-1">
            <ScreenScaffold recipe="sessionAddExercise" className="w-full">
              <SharedScreenHeader
                recipe="sessionAddExercise"
                title="Add Exercise"
                action={<TopRightBackButton href="/session/dev-session" ariaLabel="Back to session" historyBehavior="fallback-only" />}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <ScreenScaffold recipe="sessionAddExercise" className="w-full">
            <SessionQuickAddExerciseForm
              sessionId="dev-session"
              exercises={[...mockPickerExercises]}
              weightUnit="lbs"
              exerciseStats={[]}
              backHref="/session/dev-session"
              quickAddExerciseAction={noopActionResult}
            />
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
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
            selectedSessionId="history-session-2"
            initialViewMode={initialViewMode}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
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
          <ExerciseBrowserClient rows={rows} inlineHeaderControls initialViewMode={initialViewMode} />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

function renderHistoryDetailScenario(scenario: MobileFixtureScenario) {
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
              initialDayName="Day 5"
              initialNotes="Broken media fixtures should preserve spacing and not collapse summary rows."
              unitLabel="lbs"
              exerciseNameMap={{ [MOCK_EXERCISE_IDS.squat]: "Back Squat", [MOCK_EXERCISE_IDS.walk]: "Incline Walk" }}
              sessionSummary={mockHistorySessions[1]}
              backHref="/history?tab=sessions"
              exercises={[...mockHistoryDetailExercises]}
            />
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}

function renderSettingsScenario(scenario: MobileFixtureScenario) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="modal">
      <RegressionMarker scenario={scenario} />
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={(
          <ContentRail className="py-1">
            <SurfaceCard dense>
              <AppHeader
                title="Settings"
                subtitle="Account, defaults, and appearance"
                meta="dev-regression@example.com"
                action={<Chip tone="success">Signed in</Chip>}
                className={CARD_HEADER_CLASS_NAME}
              />
            </SurfaceCard>
          </ContentRail>
        )}
      >
        <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
          <SurfaceCard>
            <AppHeader
              title="Profile"
              meta="Keep your sign-in email current for recovery and verification flows."
              titleAs="h2"
              className={CARD_HEADER_CLASS_NAME}
              titleClassName={SECTION_TITLE_CLASS_NAME}
            />
            <div className="pointer-events-none">
              <AccountSettingsForm email="dev-regression@example.com" username="dev-regression" />
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <AppHeader
              title="Preferences"
              meta="Tune visual density and default units without changing the rest of the app shell."
              titleAs="h2"
              className={CARD_HEADER_CLASS_NAME}
              titleClassName={SECTION_TITLE_CLASS_NAME}
            />
            <div className="pointer-events-none">
              <GlassEffectsSettings preferredWeightUnit="lbs" preferredDistanceUnit="mi" />
            </div>
          </SurfaceCard>
        </ContentRail>

        <PublishBottomActions>
          <BottomActionSingle>
            <BottomDockButton type="button" intent="danger" disabled>Sign out</BottomDockButton>
          </BottomActionSingle>
        </PublishBottomActions>
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
          { label: "7D Total", value: "6.4 mi" },
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
          { label: "Added Load", value: "25 lb" },
          { label: "28D Reps", value: "94 reps" },
          { label: "Last Best", value: "9 reps", timeframe: "Tue, Apr 8" },
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
        lastSummary: "225 lb x 5",
      },
      totals: {
        sessions: 14,
        sets: 42,
        reps: 168,
      },
      bests: {
        bestWeight: 275,
        bestRepsAtBestWeight: 3,
        bestSetSummary: "275 lb x 3",
      },
      prLabel: "Load PR",
      prCount: 1,
      quickMetrics: [
        { label: "Last", value: "Wed, Apr 9", timeframe: "225 lb x 5" },
        { label: "Best Set", value: "275 lb x 3" },
        { label: "PRs", value: "1", timeframe: "Load PR" },
        { label: "Sessions", value: "14", timeframe: "42 sets logged" },
      ],
      performanceMetrics: [
        { label: "Top Set", value: "275 lb x 3" },
        { label: "e1RM", value: "303 lb" },
        { label: "4W Load", value: "9,240 lb" },
        { label: "Last", value: "Wed, Apr 9", timeframe: "225 lb x 5" },
      ],
      progress: {
        metrics: [
          { label: "Vs Previous", value: "+10 lb" },
          { label: "30D Frequency", value: "6 sessions", timeframe: "last 30 days" },
        ],
        performances: [
          { label: "Wed, Apr 9", value: "225 lb x 5", context: "4 sets" },
          { label: "Mon, Apr 7", value: "220 lb x 5", context: "4 sets" },
          { label: "Thu, Apr 3", value: "275 lb x 3", context: "5 sets" },
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
