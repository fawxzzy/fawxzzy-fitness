import type { SessionSummary } from "@/app/history/session-summary";
import type { ThirtyDayHistorySummary } from "@/lib/history-30-day-summary";
import type { HistorySessionsPageData } from "@/lib/history-sessions-page-loader";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";
import type { IncomingHistoryAuditExercise } from "@/lib/history-log-normalization";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
export {
  HISTORY_PREVIEW_COOKIE_NAME,
  HISTORY_PREVIEW_FLAG_ENV,
  isHistoryPreviewAllowedHost,
  isHistoryPreviewEnabledInEnv,
  normalizeHistoryPreviewTarget,
} from "@/lib/history-preview-config";

export const HISTORY_PREVIEW_USER_ID = "history-preview-user";
export const HISTORY_PREVIEW_PRIMARY_SESSION_ID = "history-preview-session-2";

const historyPreviewSessions: SessionSummary[] = [
  {
    id: HISTORY_PREVIEW_PRIMARY_SESSION_ID,
    startedAt: "2026-04-21T12:30:00.000Z",
    routineTitle: "Lower Rotation",
    dayTitle: "Day 5",
    exerciseNames: ["Back Squat", "Walking Lunge", "Incline Walk", "Plank"],
    prExerciseNames: ["Back Squat", "Walking Lunge"],
    recapSignals: [
      { exerciseName: "Back Squat", signals: ["pr", "promotion"], tagLabels: ["BEST"] },
      { exerciseName: "Walking Lunge", signals: ["pr", "watch"] },
      { exerciseName: "Incline Walk", signals: [] },
      { exerciseName: "Plank", signals: [] },
    ],
    durationSec: 3540,
    exerciseCount: 4,
    setCount: 14,
    repCount: 56,
    prCounts: { reps: 1, weight: 1, total: 2 },
    prLabel: "2 PRs",
    topSet: {
      exerciseName: "Back Squat",
      display: "245lb x 5",
    },
    bestLift: {
      exerciseName: "Back Squat",
      display: "245lb x 5",
    },
    totalVolume: 9825,
    completionRate: 1,
    hasNote: true,
    hasSetData: true,
    progressionSummary: {
      eventCount: 2,
      promotionCount: 1,
      deloadCount: 0,
      manualChangeCount: 1,
      revertCount: 0,
      lockInCount: 0,
      linkedSessionCount: 1,
      distinctExerciseCount: 2,
      firstChangeAt: "2026-04-21T12:30:00.000Z",
      latestChangeAt: "2026-04-21T12:31:00.000Z",
      lastPromotionAt: "2026-04-21T12:31:00.000Z",
      affectedExerciseNames: ["Back Squat", "Walking Lunge"],
      headline: "1 promotion applied",
      detail: "Back Squat, Walking Lunge",
    },
  },
  {
    id: "history-preview-session-1",
    startedAt: "2026-04-18T12:30:00.000Z",
    routineTitle: "Pull Focus",
    dayTitle: "Day 3",
    durationSec: 3000,
    exerciseCount: 3,
    setCount: 11,
    repCount: 41,
    prCounts: { reps: 1, weight: 0, total: 1 },
    prLabel: "1 PR",
    topSet: {
      exerciseName: "Weighted Pull-Up",
      display: "25lb x 5",
    },
    bestLift: {
      exerciseName: "Weighted Pull-Up",
      display: "25lb x 5",
    },
    totalVolume: 4210,
    completionRate: 1,
    hasNote: false,
    hasSetData: true,
  },
  {
    id: "history-preview-session-0",
    startedAt: "2026-04-15T12:30:00.000Z",
    routineTitle: "Conditioning Reset",
    dayTitle: "Recovery",
    durationSec: 1980,
    exerciseCount: 2,
    setCount: 5,
    repCount: 0,
    prCounts: { reps: 0, weight: 0, total: 0 },
    prLabel: "",
    topSet: {
      exerciseName: "Incline Walk",
      display: "24m | 1.8mi",
    },
    bestLift: {
      exerciseName: "Incline Walk",
      display: "24m | 1.8mi",
    },
    totalVolume: 0,
    completionRate: 1,
    hasNote: true,
    hasSetData: true,
  },
];

const historyPreviewExerciseRows: ExerciseBrowserRow[] = [
  {
    exerciseId: "history-preview-exercise-squat",
    name: "Back Squat",
    slug: "back-squat",
    image_path: null,
    image_icon_path: "/missing/history-preview/icon-squat.png",
    image_howto_path: "/missing/history-preview/howto-squat.png",
    how_to_short: "Brace hard, stay over mid-foot, and drive the floor away on every rep.",
    primary_muscle: "Quads",
    equipment: "Barbell",
    movement_pattern: "Squat",
    last_performed_at: "2026-04-21T12:30:00.000Z",
    last_weight: 245,
    last_reps: 5,
    last_unit: "lbs",
    pr_weight: 245,
    pr_reps: 5,
    pr_est_1rm: 286,
    actual_pr_weight: 245,
    actual_pr_reps: 5,
    actual_pr_at: "2026-04-21T12:30:00.000Z",
    kind: "strength",
    lastSummary: "245lbx5",
    bestSummary: "245lbx5",
    prLabel: "Load PR",
    prCount: 1,
    sessionCount: 2,
    deltaFromBest: "Matched | best",
    tagsSummary: "Quads | Squat | Barbell",
  },
  {
    exerciseId: "history-preview-exercise-pullup",
    name: "Weighted Pull-Up",
    slug: "weighted-pull-up",
    image_path: null,
    image_icon_path: "/missing/history-preview/icon-pullup.png",
    image_howto_path: null,
    how_to_short: "Start from a dead hang, keep the ribs down, and finish with elbows to pockets.",
    primary_muscle: "Back",
    equipment: "Dip Belt",
    movement_pattern: "Vertical Pull",
    last_performed_at: "2026-04-18T12:30:00.000Z",
    last_weight: 25,
    last_reps: 5,
    last_unit: "lbs",
    pr_weight: 25,
    pr_reps: 5,
    pr_est_1rm: 29,
    actual_pr_weight: 25,
    actual_pr_reps: 5,
    actual_pr_at: "2026-04-18T12:30:00.000Z",
    kind: "strength",
    lastSummary: "25lbx5",
    bestSummary: "25lbx5",
    prLabel: "Rep PR",
    prCount: 1,
    sessionCount: 1,
    deltaFromBest: "+1 rep vs prior",
    tagsSummary: "Back | Vertical Pull | Dip Belt",
  },
  {
    exerciseId: "history-preview-exercise-walk",
    name: "Incline Walk",
    slug: "incline-walk",
    image_path: null,
    image_icon_path: "/missing/history-preview/icon-walk.png",
    image_howto_path: "/missing/history-preview/howto-walk.png",
    how_to_short: "Keep posture stacked, settle into a repeatable pace, and let incline drive the effort.",
    primary_muscle: "Cardio",
    equipment: "Treadmill",
    movement_pattern: "Gait",
    last_performed_at: "2026-04-15T12:30:00.000Z",
    last_weight: null,
    last_reps: null,
    last_unit: null,
    pr_weight: null,
    pr_reps: null,
    pr_est_1rm: null,
    actual_pr_weight: null,
    actual_pr_reps: null,
    actual_pr_at: null,
    kind: "cardio",
    lastSummary: "24m | 1.8 mi | 13:20/mi",
    bestSummary: "Best | 2.1 mi",
    prLabel: "",
    prCount: 0,
    sessionCount: 1,
    deltaFromBest: "+0.2 mi vs prior",
    tagsSummary: "Cardio | Gait | Treadmill",
  },
];

const historyPreviewExerciseNameMap = {
  "history-preview-exercise-squat": "Back Squat",
  "history-preview-exercise-lunge": "Walking Lunge",
  "history-preview-exercise-walk": "Incline Walk",
  "history-preview-exercise-plank": "Plank",
} satisfies Record<string, string>;

const historyPreviewWeeklyProgress: WeeklyProgressSummary = {
  timezone: "America/New_York",
  weekStart: "2026-04-20",
  weekEnd: "2026-04-26",
  primaryRoutineTitle: "Atlas",
  primaryRoutineTargetCount: 4,
  completedWorkoutCount: 1,
  previousWeekWorkoutCount: 2,
  activeDayCount: 1,
  prMomentCount: 2,
  prExerciseNames: ["Back Squat", "Walking Lunge"],
  consistencyTrend: {
    direction: "down",
    label: "-1 vs last week",
    detail: "1 workout this week after 2 workouts last week.",
    delta: -1,
  },
  volumeCategories: [
    { key: "strength", label: "Strength", setCount: 7, exerciseCount: 2 },
    { key: "cardio", label: "Cardio", setCount: 5, exerciseCount: 2 },
  ],
  progressScore: {
    value: 5,
    max: 10,
    breakdown: [
      { label: "Workouts", value: 1, max: 4 },
      { label: "PRs", value: 2, max: 3 },
      { label: "Consistency", value: 0, max: 2 },
      { label: "Coverage", value: 0, max: 1 },
    ],
    summary: "1/4 workouts • 2/3 prs",
  },
  progressionSummary: {
    totalEventCount: 2,
    promotionCount: 1,
    deloadCount: 0,
    manualChangeCount: 1,
    chartSections: [
      {
        id: "progression-activity",
        title: "Progression Activity",
        description: "How progression changes stacked across the current week.",
        emptyTitle: "No progression activity yet.",
        emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
        bars: [
          { id: "2026-04-21", label: "Apr 21", value: 2, valueLabel: "2 events", detail: "2 changes landed." },
        ],
      },
      {
        id: "progression-event-mix",
        title: "Change Mix",
        description: "Which change types are driving the visible progression slice.",
        emptyTitle: "No change mix yet.",
        emptyCaption: "The mix appears after the first progression event is recorded.",
        bars: [
          { id: "manual_target_change", label: "Manual target change", value: 1, valueLabel: "1 event", detail: null },
          { id: "promotion_applied", label: "Promotion applied", value: 1, valueLabel: "1 event", detail: null },
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
        ],
      },
    ],
    activityBuckets: [
      {
        id: "2026-04-21",
        label: "Apr 21",
        detail: "2 changes landed.",
        valueLabel: "2 events",
        eventCount: 2,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 1,
        revertCount: 0,
        items: [
          "Back Squat promoted | 6 reps -> 7 reps",
          "Walking Lunge manual target change | 10 reps -> 12 reps",
        ],
        hotspotItems: [
          "Promotion hotspot: Back Squat.",
          "Manual-change hotspot: Walking Lunge.",
        ],
      },
    ],
    topProgressedExerciseNames: ["Back Squat"],
    topDeloadExerciseNames: [],
    topAdjustedExerciseNames: ["Walking Lunge"],
    reviewItems: [
      "2 progression events landed this week.",
      "1 promotion applied across 1 exercise.",
      "0 regressions and 1 manual change were recorded.",
    ],
    hotspotItems: [
      "Promotion hotspot: Back Squat.",
      "Manual-change hotspot: Walking Lunge.",
    ],
    timelineItems: [
      "Active progression days: 1 day.",
      "Busiest day: Apr 21 (2 events).",
      "Latest progression: Back Squat on Apr 21.",
    ],
    attentionItems: [],
  },
  hotspotItems: [
    "Hotspot: Back Squat showed up in 1 session.",
    "Most improved: Back Squat.",
  ],
  attentionItems: [
    "Needs attention: 3 planned sessions still open this cycle.",
    "Momentum slipped vs last week.",
  ],
};

const historyPreviewThirtyDaySummary: ThirtyDayHistorySummary = {
  timezone: "America/New_York",
  windowStart: "2026-03-23",
  windowEnd: "2026-04-21",
  scopeLabel: "All Time",
  primaryRoutineTitle: "Lower Rotation",
  completedWorkoutCount: 3,
  activeDayCount: 3,
  exerciseCount: 7,
  routineCount: 3,
  prMomentCount: 3,
  prExerciseNames: ["Back Squat", "Weighted Pull-Up"],
  primaryRoutineCoverage: {
    completedDayCount: 1,
    targetDayCount: 4,
  },
  consistencyTrend: {
    direction: "flat",
    label: "Matched last week",
    detail: "1 workout in each of the last two weeks.",
    delta: 0,
  },
  progressionSummary: {
    totalEventCount: 3,
    promotionCount: 2,
    deloadCount: 0,
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
          { id: "2026-04-14", label: "Apr 14 - Apr 20", value: 1, valueLabel: "1 event", detail: "1 change landed." },
          { id: "2026-04-21", label: "Apr 21 - Apr 27", value: 2, valueLabel: "2 events", detail: "2 changes landed." },
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
          { id: "weighted-pull-up", label: "Weighted Pull-Up", value: 1, valueLabel: "1 promotion", detail: null },
        ],
      },
    ],
    activityBuckets: [
      {
        id: "2026-04-14",
        label: "Apr 14 - Apr 20",
        detail: "1 change landed.",
        valueLabel: "1 event",
        eventCount: 1,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 0,
        revertCount: 0,
        items: [
          "Weighted Pull-Up promoted | 6 reps -> 7 reps",
        ],
        hotspotItems: [
          "Promotion hotspot: Weighted Pull-Up.",
        ],
      },
      {
        id: "2026-04-21",
        label: "Apr 21 - Apr 27",
        detail: "2 changes landed.",
        valueLabel: "2 events",
        eventCount: 2,
        promotionCount: 1,
        deloadCount: 0,
        manualChangeCount: 1,
        revertCount: 0,
        items: [
          "Back Squat promoted | 6 reps -> 7 reps",
          "Incline Walk manual target change | 12:00 -> 15:00",
        ],
        hotspotItems: [
          "Promotion hotspot: Back Squat.",
          "Manual-change hotspot: Incline Walk.",
        ],
      },
    ],
    topProgressedExerciseNames: ["Back Squat", "Weighted Pull-Up"],
    topDeloadExerciseNames: [],
    topAdjustedExerciseNames: ["Incline Walk"],
    reviewItems: [
      "3 progression events recorded across your history.",
      "2 promotions landed across 2 exercises.",
      "0 deloads, 1 manual change, and 0 reverts were recorded.",
      "Most progressed: Back Squat, Weighted Pull-Up.",
    ],
    hotspotItems: [
      "Promotion hotspot: Back Squat.",
      "Manual-change hotspot: Incline Walk.",
    ],
    timelineItems: [
      "Active weeks: 2 weeks.",
      "Busiest week: Apr 20 (2 events).",
      "Latest progression: Back Squat on Apr 21.",
    ],
    attentionItems: [],
  },
  hotspotItems: [
    "Most improved: Back Squat.",
    "Net progress: 2 promotions landed in this window.",
    "Stalled: Incline Walk showed up in 1 session without a PR or promotion signal.",
  ],
  reviewItems: [
    "3 workouts across 3 workout days.",
    "Lower Rotation led with 1 workout.",
    "7 exercises trained across 3 routines.",
    "1 workout in each of the last two weeks.",
  ],
  attentionItems: [],
};

const historyPreviewWeeklyProgressByWeek: WeeklyProgressSummary[] = [
  historyPreviewWeeklyProgress,
  {
    timezone: "America/New_York",
    weekStart: "2026-04-13",
    weekEnd: "2026-04-19",
    primaryRoutineTitle: "Atlas",
    primaryRoutineTargetCount: 4,
    completedWorkoutCount: 2,
    previousWeekWorkoutCount: 0,
    activeDayCount: 2,
    prMomentCount: 1,
    prExerciseNames: ["Weighted Pull-Up"],
    consistencyTrend: {
      direction: "new",
      label: "Opened the week",
      detail: "2 workouts across 2 days.",
      delta: 2,
    },
    volumeCategories: [
      { key: "strength", label: "Strength", setCount: 11, exerciseCount: 1 },
      { key: "cardio", label: "Cardio", setCount: 5, exerciseCount: 1 },
    ],
    progressScore: {
      value: 5,
      max: 10,
      breakdown: [
        { label: "Workouts", value: 2, max: 4 },
        { label: "PRs", value: 1, max: 3 },
        { label: "Consistency", value: 2, max: 2 },
        { label: "Coverage", value: 0, max: 1 },
      ],
      summary: "2/4 workouts • 1/3 prs • 2/2 consistency",
    },
    progressionSummary: {
      totalEventCount: 1,
      promotionCount: 1,
      deloadCount: 0,
      manualChangeCount: 0,
      chartSections: [
        {
          id: "progression-activity",
          title: "Progression Activity",
          description: "How progression changes stacked across the current week.",
          emptyTitle: "No progression activity yet.",
          emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
          bars: [
            { id: "2026-04-16", label: "Apr 16", value: 1, valueLabel: "1 event", detail: "1 change landed." },
          ],
        },
        {
          id: "progression-event-mix",
          title: "Change Mix",
          description: "Which change types are driving the visible progression slice.",
          emptyTitle: "No change mix yet.",
          emptyCaption: "The mix appears after the first progression event is recorded.",
          bars: [
            { id: "promotion_applied", label: "Promotion applied", value: 1, valueLabel: "1 event", detail: null },
          ],
        },
        {
          id: "progression-hotspots",
          title: "Promotion Hotspots",
          description: "Exercises with the most promotions in the visible progression slice.",
          emptyTitle: "No promotion hotspots yet.",
          emptyCaption: "Promotion hotspots appear after the first applied promotion lands.",
          bars: [
            { id: "weighted-pull-up", label: "Weighted Pull-Up", value: 1, valueLabel: "1 promotion", detail: null },
          ],
        },
      ],
      activityBuckets: [
        {
          id: "2026-04-16",
          label: "Apr 16",
          detail: "1 change landed.",
          valueLabel: "1 event",
          eventCount: 1,
          promotionCount: 1,
          deloadCount: 0,
          manualChangeCount: 0,
          revertCount: 0,
          items: [
            "Weighted Pull-Up promoted | 5 reps -> 6 reps",
          ],
          hotspotItems: [
            "Promotion hotspot: Weighted Pull-Up.",
          ],
        },
      ],
      topProgressedExerciseNames: ["Weighted Pull-Up"],
      topDeloadExerciseNames: [],
      topAdjustedExerciseNames: [],
      reviewItems: [
        "1 progression event landed this week.",
        "1 promotion applied across 1 exercise.",
        "No regressions or manual target changes were recorded.",
      ],
      hotspotItems: [
        "Promotion hotspot: Weighted Pull-Up.",
      ],
      timelineItems: [
        "Active progression days: 1 day.",
        "Busiest day: Apr 16 (1 event).",
        "Latest progression: Weighted Pull-Up on Apr 16.",
      ],
      attentionItems: [],
    },
    hotspotItems: [
      "Hotspot: Weighted Pull-Up showed up in 1 session.",
      "Most improved: Weighted Pull-Up.",
      "Net progress: 2 extra workouts vs last week.",
    ],
    attentionItems: [
      "Needs attention: 2 planned sessions still open this cycle.",
    ],
  },
];

const historyPreviewDetailExercises: IncomingHistoryAuditExercise[] = [
  {
    id: "history-preview-row-squat",
    exercise_id: "history-preview-exercise-squat",
    exercise_name: "Back Squat",
    exercise_slug: "back-squat",
    exercise_image_icon_path: "/missing/history-preview/icon-squat.png",
    exercise_image_howto_path: "/missing/history-preview/howto-squat.png",
    notes: "Top set moved well after the second warmup. Keep bracing consistent on set four.",
    measurement_type: "reps",
    default_unit: "lbs",
    sets: [
      { id: "history-preview-set-1", set_index: 0, weight: 225, reps: 5, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
      { id: "history-preview-set-2", set_index: 1, weight: 235, reps: 5, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
      { id: "history-preview-set-3", set_index: 2, weight: 245, reps: 5, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
      { id: "history-preview-set-4", set_index: 3, weight: 235, reps: 6, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
    ],
  },
  {
    id: "history-preview-row-lunge",
    exercise_id: "history-preview-exercise-lunge",
    exercise_name: "Walking Lunge",
    exercise_slug: "walking-lunge",
    exercise_image_icon_path: "/missing/history-preview/icon-lunge.png",
    exercise_image_howto_path: null,
    notes: "Keep the step length long enough that the front shin does not collapse forward.",
    measurement_type: "reps",
    default_unit: "lbs",
    sets: [
      { id: "history-preview-set-5", set_index: 0, weight: 35, reps: 12, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
      { id: "history-preview-set-6", set_index: 1, weight: 35, reps: 12, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
      { id: "history-preview-set-7", set_index: 2, weight: 40, reps: 10, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: "lbs" },
    ],
  },
  {
    id: "history-preview-row-walk",
    exercise_id: "history-preview-exercise-walk",
    exercise_name: "Incline Walk",
    exercise_slug: "incline-walk",
    exercise_image_icon_path: "/missing/history-preview/icon-walk.png",
    exercise_image_howto_path: "/missing/history-preview/howto-walk.png",
    notes: null,
    measurement_type: "time_distance",
    default_unit: "mi",
    sets: [
      { id: "history-preview-set-8", set_index: 0, weight: null, reps: null, duration_seconds: 720, distance: 0.9, distance_unit: "mi", calories: 118, weight_unit: null },
      { id: "history-preview-set-9", set_index: 1, weight: null, reps: null, duration_seconds: 720, distance: 0.9, distance_unit: "mi", calories: 121, weight_unit: null },
    ],
  },
  {
    id: "history-preview-row-plank",
    exercise_id: "history-preview-exercise-plank",
    exercise_name: "Plank",
    exercise_slug: "plank",
    exercise_image_icon_path: "/missing/history-preview/icon-plank.png",
    exercise_image_howto_path: null,
    notes: "Stay tucked instead of letting the ribs drift up in the last 10 seconds.",
    measurement_type: "time",
    default_unit: "sec",
    sets: [
      { id: "history-preview-set-10", set_index: 0, weight: null, reps: null, duration_seconds: 45, distance: null, distance_unit: null, calories: null, weight_unit: null },
      { id: "history-preview-set-11", set_index: 1, weight: null, reps: null, duration_seconds: 45, distance: null, distance_unit: null, calories: null, weight_unit: null },
      { id: "history-preview-set-12", set_index: 2, weight: null, reps: null, duration_seconds: 60, distance: null, distance_unit: null, calories: null, weight_unit: null },
    ],
  },
];

function getSelectedSessionId(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

export function getHistoryPreviewSessionsPageData(args?: {
  selected?: string | string[] | null;
}): HistorySessionsPageData {
  return {
    activeRoutineTitle: "Atlas",
    nextCursor: null,
    selectedSessionId: getSelectedSessionId(args?.selected) ?? HISTORY_PREVIEW_PRIMARY_SESSION_ID,
    sessionItems: [...historyPreviewSessions],
    currentRoutineSessionItems: [...historyPreviewSessions],
    currentCycleSessionItems: [...historyPreviewSessions],
    subtitle: `${historyPreviewSessions.length} completed sessions`,
    thirtyDaySummary: historyPreviewThirtyDaySummary,
    currentRoutineThirtyDaySummary: {
      ...historyPreviewThirtyDaySummary,
      scopeLabel: "Current Routine: Atlas",
    },
    currentCycleThirtyDaySummary: {
      ...historyPreviewThirtyDaySummary,
      scopeLabel: "Current Cycle: Apr 20 - Apr 26",
    },
    weeklyProgress: historyPreviewWeeklyProgress,
    currentRoutineWeeklyProgress: historyPreviewWeeklyProgress,
    currentCycleWeeklyProgress: historyPreviewWeeklyProgress,
    weeklyProgressByWeek: historyPreviewWeeklyProgressByWeek,
    currentRoutineWeeklyProgressByWeek: historyPreviewWeeklyProgressByWeek,
    currentCycleWeeklyProgressByWeek: [historyPreviewWeeklyProgress],
  };
}

export function getHistoryPreviewExerciseRows(): ExerciseBrowserRow[] {
  return [...historyPreviewExerciseRows];
}

export function getHistoryPreviewDetailPageData(sessionId: string) {
  if (sessionId !== HISTORY_PREVIEW_PRIMARY_SESSION_ID) {
    return null;
  }

  return {
    initialDayName: "Day 5",
    initialNotes: "Broken media fixtures should preserve spacing, and the floating header should stay pinned while the log scrolls.",
    unitLabel: "lbs" as const,
    exerciseNameMap: historyPreviewExerciseNameMap,
    sessionSummary: historyPreviewSessions[0],
    backHref: `/history?tab=sessions&selected=${HISTORY_PREVIEW_PRIMARY_SESSION_ID}`,
    exercises: historyPreviewDetailExercises,
  };
}

export function getHistoryPreviewLinks() {
  return [
    {
      label: "/history",
      href: "/history",
      description: "Session overview route with shared chrome and deterministic session rows.",
    },
    {
      label: "/history/exercises",
      href: "/history/exercises",
      description: "Exercise browser route with deterministic density and media fallback coverage.",
    },
    {
      label: `/history/${HISTORY_PREVIEW_PRIMARY_SESSION_ID}`,
      href: `/history/${HISTORY_PREVIEW_PRIMARY_SESSION_ID}`,
      description: "Detail route with pinned floating header and deterministic log content.",
    },
  ] as const;
}
