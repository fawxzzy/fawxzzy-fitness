export type MobileRouteKey =
  | "today"
  | "session"
  | "routines"
  | "viewDay"
  | "editDay"
  | "createRoutine"
  | "editRoutine"
  | "addExercise"
  | "historySessions"
  | "historyExercises"
  | "historyDetail"
  | "settings"
  | "exerciseDetail";

export type MobileRegressionScreenKey =
  | "today"
  | "session"
  | "routines"
  | "view-day"
  | "edit-day"
  | "create-routine"
  | "edit-routine"
  | "add-exercise"
  | "history-sessions"
  | "history-exercises"
  | "history-detail"
  | "settings"
  | "exercise-detail";

export const mobileRegressionBoardFamilies = [
  { family: "Exercise cards", boardFile: "exercise-cards-board.png" },
  { family: "Session / logging", boardFile: "session-logging-board.png" },
  { family: "Session summaries", boardFile: "session-summaries-board.png" },
  { family: "Settings / detail", boardFile: "settings-detail-board.png" },
] as const;

export const mobileRegressionReviewFamilies = mobileRegressionBoardFamilies.map((entry) => entry.family) as ReadonlyArray<
  (typeof mobileRegressionBoardFamilies)[number]["family"]
>;

export type MobileRegressionReviewFamily = (typeof mobileRegressionBoardFamilies)[number]["family"];

export type ScreenGeometry = {
  viewportWidth: number;
  viewportHeight: number;
  safeAreaTop: number;
  dockTop: number;
  lastInteractiveRowBottom: number;
  titleTop: number;
  topSpacingOwners: number;
  bottomDockSpacingOwners: number;
};

export type FilterChipFrame = {
  label: string;
  left: number;
  right: number;
};

export type LibraryCardTextLayout = {
  titleLineCount: number;
  metadataColumnWidth: number;
};

export type SessionStatusChip = "logged" | "skipped" | "in-progress";

export type CardState = "default" | "selected" | "active" | "completed" | "empty";

export type CardStateFixture = {
  cardId: string;
  state: CardState;
  badgeText?: string;
};

export type ReorderTextFixture = {
  heading: string;
  dragHandleLabel: string;
  items: string[];
};

export type GoalFormReadabilityFixture = {
  heading: string;
  fieldLabels: string[];
  helperCopy: string[];
};

export type GoalRowLayoutFixture = {
  titleMaxLines: number;
  goalMaxLines: number;
  dedicatedRow: boolean;
  wrapsBeforeTruncation: boolean;
};

export type DetailedModeFixture = {
  extraMetricCount: number;
  analyticsSlotsReady: boolean;
};

export type ExerciseInfoLayoutFixture = {
  mediaFullyVisible: boolean;
  quickMetricCount: number;
  hasProgressBlock: boolean;
  hasRecentHistoryBlock: boolean;
  sectionOrder: Array<"Overview" | "Performance" | "Progress" | "Recent History">;
  topSafePaddingRelaxed: boolean;
};

export type HistorySurfaceToken = "history-browser" | "history-detail";

export type MobileFixtureScenario = {
  id: string;
  route: MobileRouteKey;
  screen: MobileRegressionScreenKey;
  family: MobileRegressionReviewFamily;
  name: string;
  fixture: string;
  geometry: ScreenGeometry;
  fixtureState: string;
  restDay?: boolean;
  inSessionSummary?: boolean;
  activeSession?: boolean;
  currentView?: "current" | "list";
  filterChipFrames?: FilterChipFrame[];
  libraryCardTextLayout?: LibraryCardTextLayout;
  statusChips?: SessionStatusChip[];
  allowLoggedAndSkipped?: boolean;
  cardStates?: CardStateFixture[];
  reorderText?: ReorderTextFixture;
  goalForm?: GoalFormReadabilityFixture;
  usesFloatingHeader: boolean;
  todayHeaderMatchesSelectedDay?: boolean;
  hasExtraLowerFillerBox?: boolean;
  headerPinned?: boolean;
  reorderActionVisible?: boolean;
  manualOrderEdit?: {
    listSize: number;
    attemptedOrders: number[];
    normalizedOrders: number[];
    surroundingItemsShifted: boolean;
  };
  bottomDockLayout?: "split" | "stacked";
  historyLogHeaderCount?: number;
  historyHeaderOwnerCount?: number;
  historySurfaceToken?: HistorySurfaceToken;
  exerciseInfoHeaderPinned?: boolean;
  currentSessionSaveSetHeaderPinned?: boolean;
  captureScrollPosition?: "top" | "bottom";
  cardParityModes?: Array<"view" | "edit" | "reorder">;
  sectionChromeOwnedByShell?: boolean;
  goalRowLayout?: GoalRowLayoutFixture;
  detailedMode?: DetailedModeFixture;
  exerciseInfoLayout?: ExerciseInfoLayoutFixture;
};

const MOBILE_VIEWPORT = {
  viewportWidth: 390,
  viewportHeight: 844,
  safeAreaTop: 47,
} as const;

function withBaseGeometry(overrides: Partial<ScreenGeometry>): ScreenGeometry {
  return {
    ...MOBILE_VIEWPORT,
    dockTop: 744,
    lastInteractiveRowBottom: 710,
    titleTop: 74,
    topSpacingOwners: 1,
    bottomDockSpacingOwners: 1,
    ...overrides,
  };
}

function buildWorkoutFixture(args: {
  id: string;
  family: MobileRegressionReviewFamily;
  name: string;
  fixture: string;
  fixtureState: string;
  lastInteractiveRowBottom?: number;
  inSessionSummary?: boolean;
  activeSession?: boolean;
  statusChips?: SessionStatusChip[];
  cardStates?: CardStateFixture[];
  currentSessionSaveSetHeaderPinned?: boolean;
  todayHeaderMatchesSelectedDay?: boolean;
  hasExtraLowerFillerBox?: boolean;
  exerciseInfoHeaderPinned?: boolean;
  detailedMode?: DetailedModeFixture;
}) {
  return {
    id: args.id,
    route: args.activeSession ? "session" : "today",
    screen: args.activeSession ? "session" : "today",
    family: args.family,
    name: args.name,
    fixture: args.fixture,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: args.lastInteractiveRowBottom ?? 710 }),
    inSessionSummary: args.inSessionSummary,
    activeSession: args.activeSession,
    statusChips: args.statusChips,
    cardStates: args.cardStates,
    usesFloatingHeader: true,
    currentSessionSaveSetHeaderPinned: args.currentSessionSaveSetHeaderPinned,
    todayHeaderMatchesSelectedDay: args.todayHeaderMatchesSelectedDay,
    hasExtraLowerFillerBox: args.hasExtraLowerFillerBox,
    exerciseInfoHeaderPinned: args.exerciseInfoHeaderPinned,
    sectionChromeOwnedByShell: true,
    detailedMode: args.detailedMode,
    goalRowLayout: args.inSessionSummary ? undefined : {
      titleMaxLines: 2,
      goalMaxLines: 2,
      dedicatedRow: true,
      wrapsBeforeTruncation: true,
    },
  } satisfies MobileFixtureScenario;
}

function buildRoutinesFixture(args: {
  id: string;
  family: MobileRegressionReviewFamily;
  name: string;
  fixture: string;
  fixtureState: string;
  currentView: "current" | "list";
  lastInteractiveRowBottom?: number;
  historyLogHeaderCount?: number;
}) {
  return {
    id: args.id,
    route: "routines",
    screen: "routines",
    family: args.family,
    name: args.name,
    fixture: args.fixture,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: args.lastInteractiveRowBottom ?? 700 }),
    currentView: args.currentView,
    historyLogHeaderCount: args.historyLogHeaderCount,
    cardStates: [{ cardId: "routine-card-primary", state: "selected", badgeText: "Current" }],
    usesFloatingHeader: true,
    sectionChromeOwnedByShell: true,
  } satisfies MobileFixtureScenario;
}

function buildDayFixture(args: {
  id: string;
  family: MobileRegressionReviewFamily;
  route: "viewDay" | "editDay";
  name: string;
  fixture: string;
  fixtureState: string;
  lastInteractiveRowBottom?: number;
  restDay?: boolean;
  reorderText?: ReorderTextFixture;
  goalForm?: GoalFormReadabilityFixture;
  cardStates?: CardStateFixture[];
  headerPinned?: boolean;
  reorderActionVisible?: boolean;
  manualOrderEdit?: MobileFixtureScenario["manualOrderEdit"];
  hasExtraLowerFillerBox?: boolean;
  cardParityModes?: MobileFixtureScenario["cardParityModes"];
}) {
  return {
    id: args.id,
    route: args.route,
    screen: args.route === "viewDay" ? "view-day" : "edit-day",
    family: args.family,
    name: args.name,
    fixture: args.fixture,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: args.lastInteractiveRowBottom ?? 696 }),
    restDay: args.restDay,
    reorderText: args.reorderText,
    goalForm: args.goalForm,
    cardStates: args.cardStates,
    usesFloatingHeader: true,
    headerPinned: args.headerPinned,
    reorderActionVisible: args.reorderActionVisible,
    manualOrderEdit: args.manualOrderEdit,
    hasExtraLowerFillerBox: args.hasExtraLowerFillerBox,
    cardParityModes: args.cardParityModes,
    sectionChromeOwnedByShell: true,
    goalRowLayout: args.restDay ? undefined : {
      titleMaxLines: 2,
      goalMaxLines: 2,
      dedicatedRow: true,
      wrapsBeforeTruncation: true,
    },
  } satisfies MobileFixtureScenario;
}

function buildAddExerciseFixture(args: {
  id: string;
  family: MobileRegressionReviewFamily;
  name: string;
  fixture: string;
  fixtureState: string;
  filterChipFrames: FilterChipFrame[];
  goalForm?: GoalFormReadabilityFixture;
}) {
  return {
    id: args.id,
    route: "addExercise",
    screen: "add-exercise",
    family: args.family,
    name: args.name,
    fixture: args.fixture,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 700 }),
    filterChipFrames: args.filterChipFrames,
    goalForm: args.goalForm,
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 172 },
    usesFloatingHeader: true,
    sectionChromeOwnedByShell: true,
  } satisfies MobileFixtureScenario;
}

function buildSimpleFixture(args: {
  id: string;
  route: MobileRouteKey;
  screen: MobileRegressionScreenKey;
  family: MobileRegressionReviewFamily;
  name: string;
  fixture: string;
  fixtureState: string;
  lastInteractiveRowBottom?: number;
  cardStates?: CardStateFixture[];
  statusChips?: SessionStatusChip[];
  libraryCardTextLayout?: LibraryCardTextLayout;
  captureScrollPosition?: MobileFixtureScenario["captureScrollPosition"];
  detailedMode?: DetailedModeFixture;
  exerciseInfoLayout?: ExerciseInfoLayoutFixture;
  historyHeaderOwnerCount?: number;
  historySurfaceToken?: HistorySurfaceToken;
}) {
  return {
    id: args.id,
    route: args.route,
    screen: args.screen,
    family: args.family,
    name: args.name,
    fixture: args.fixture,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: args.lastInteractiveRowBottom ?? 700 }),
    cardStates: args.cardStates,
    statusChips: args.statusChips,
    libraryCardTextLayout: args.libraryCardTextLayout,
    captureScrollPosition: args.captureScrollPosition,
    usesFloatingHeader: true,
    sectionChromeOwnedByShell: true,
    detailedMode: args.detailedMode,
    exerciseInfoLayout: args.exerciseInfoLayout,
    historyHeaderOwnerCount: args.historyHeaderOwnerCount,
    historySurfaceToken: args.historySurfaceToken,
  } satisfies MobileFixtureScenario;
}

export const mobileRegressionScenarios: readonly MobileFixtureScenario[] = [
  buildWorkoutFixture({
    id: "today-default",
    family: "Exercise cards",
    name: "Today: default",
    fixture: "default",
    fixtureState: "today-default-v2",
    lastInteractiveRowBottom: 688,
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "today-overview", state: "selected", badgeText: "Today" }],
    todayHeaderMatchesSelectedDay: true,
    exerciseInfoHeaderPinned: true,
  }),
  buildWorkoutFixture({
    id: "today-detailed",
    family: "Exercise cards",
    name: "Today: detailed density",
    fixture: "detailed",
    fixtureState: "today-detailed-v1",
    lastInteractiveRowBottom: 688,
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "today-overview-detailed", state: "selected", badgeText: "Today" }],
    todayHeaderMatchesSelectedDay: true,
    exerciseInfoHeaderPinned: true,
    detailedMode: { extraMetricCount: 3, analyticsSlotsReady: true },
  }),
  buildWorkoutFixture({
    id: "today-rest",
    family: "Exercise cards",
    name: "Today: rest day",
    fixture: "rest",
    fixtureState: "today-rest-v1",
    cardStates: [{ cardId: "today-rest-state", state: "empty", badgeText: "Rest" }],
    todayHeaderMatchesSelectedDay: true,
    hasExtraLowerFillerBox: false,
    exerciseInfoHeaderPinned: true,
  }),
  buildWorkoutFixture({
    id: "today-empty",
    family: "Exercise cards",
    name: "Today: empty day",
    fixture: "empty",
    fixtureState: "today-empty-v1",
    cardStates: [{ cardId: "today-empty-state", state: "empty" }],
    todayHeaderMatchesSelectedDay: true,
    hasExtraLowerFillerBox: false,
    exerciseInfoHeaderPinned: true,
  }),
  buildWorkoutFixture({
    id: "today-in-session-summary",
    family: "Exercise cards",
    name: "Today: in-session summary",
    fixture: "in-session-summary",
    fixtureState: "today-in-session-summary-v1",
    inSessionSummary: true,
    statusChips: ["logged"],
    cardStates: [{ cardId: "session-summary", state: "completed", badgeText: "Logged" }],
    todayHeaderMatchesSelectedDay: true,
    hasExtraLowerFillerBox: false,
  }),
  buildWorkoutFixture({
    id: "active-workout-session",
    family: "Session / logging",
    name: "Active workout session",
    fixture: "active",
    fixtureState: "workout-active-v2",
    lastInteractiveRowBottom: 696,
    activeSession: true,
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "exercise-row-primary", state: "active", badgeText: "In Session" }],
    currentSessionSaveSetHeaderPinned: true,
  }),
  buildWorkoutFixture({
    id: "active-workout-session-expanded",
    family: "Session / logging",
    name: "Active workout session: expanded",
    fixture: "expanded",
    fixtureState: "workout-active-expanded-v1",
    lastInteractiveRowBottom: 696,
    activeSession: true,
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "exercise-row-expanded", state: "selected", badgeText: "In Session" }],
    currentSessionSaveSetHeaderPinned: true,
  }),
  buildRoutinesFixture({
    id: "routines-current-view",
    family: "Exercise cards",
    name: "Routines: current view",
    fixture: "current-view",
    fixtureState: "routines-current-v1",
    currentView: "current",
  }),
  buildRoutinesFixture({
    id: "routines-list-view",
    family: "Exercise cards",
    name: "Routines: list view",
    fixture: "list-view",
    fixtureState: "routines-list-v1",
    currentView: "list",
    historyLogHeaderCount: 1,
  }),
  buildDayFixture({
    id: "view-day",
    family: "Exercise cards",
    route: "viewDay",
    name: "View Day",
    fixture: "default",
    fixtureState: "view-day-v2",
    lastInteractiveRowBottom: 690,
    hasExtraLowerFillerBox: false,
    cardStates: [{ cardId: "planned-row-1", state: "default" }],
  }),
  buildDayFixture({
    id: "view-day-rest",
    family: "Exercise cards",
    route: "viewDay",
    name: "View Day: rest",
    fixture: "rest",
    fixtureState: "view-day-rest-v1",
    restDay: true,
    hasExtraLowerFillerBox: false,
    cardStates: [{ cardId: "view-day-rest-state", state: "empty", badgeText: "Rest" }],
  }),
  buildDayFixture({
    id: "view-day-empty",
    family: "Exercise cards",
    route: "viewDay",
    name: "View Day: empty",
    fixture: "empty",
    fixtureState: "view-day-empty-v1",
    hasExtraLowerFillerBox: false,
    cardStates: [{ cardId: "view-day-empty-state", state: "empty" }],
  }),
  buildDayFixture({
    id: "edit-day-default",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: default",
    fixture: "default",
    fixtureState: "edit-day-default-v1",
    headerPinned: true,
    cardStates: [{ cardId: "editable-row-1", state: "selected", badgeText: "Editing" }],
  }),
  buildDayFixture({
    id: "edit-day-reorder",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: reorder",
    fixture: "reorder",
    fixtureState: "edit-day-reorder-v1",
    headerPinned: true,
    reorderActionVisible: true,
    reorderText: {
      heading: "Reorder exercises",
      dragHandleLabel: "Drag handle",
      items: ["1. Back Squat", "2. Romanian Deadlift", "3. Walking Lunge"],
    },
    manualOrderEdit: { listSize: 3, attemptedOrders: [0, 99], normalizedOrders: [1, 3], surroundingItemsShifted: true },
    cardStates: [{ cardId: "editable-row-reorder", state: "active", badgeText: "Reordering" }],
  }),
  buildDayFixture({
    id: "edit-day-rest",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: rest",
    fixture: "rest",
    fixtureState: "edit-day-rest-v1",
    restDay: true,
    headerPinned: true,
    hasExtraLowerFillerBox: false,
    cardStates: [{ cardId: "rest-day-card", state: "empty", badgeText: "Rest" }],
  }),
  buildDayFixture({
    id: "edit-day-empty",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: empty",
    fixture: "empty",
    fixtureState: "edit-day-empty-v1",
    headerPinned: true,
    cardStates: [{ cardId: "edit-day-empty-state", state: "empty" }],
  }),
  buildDayFixture({
    id: "edit-day-edit-exercise",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: edit exercise",
    fixture: "edit-exercise",
    fixtureState: "edit-day-edit-exercise-v1",
    headerPinned: true,
    goalForm: {
      heading: "Edit exercise goal",
      fieldLabels: ["Target reps", "Target weight", "Weight unit"],
      helperCopy: ["Use realistic numbers.", "Changes save automatically."],
    },
    cardStates: [{ cardId: "editable-row-goal", state: "selected", badgeText: "Editing" }],
  }),
  buildDayFixture({
    id: "edit-day-add-exercise",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: add exercise",
    fixture: "add-exercise",
    fixtureState: "edit-day-add-exercise-v2",
    headerPinned: true,
    cardStates: [{ cardId: "add-exercise-entry", state: "default" }],
  }),
  buildDayFixture({
    id: "edit-day-card-parity",
    family: "Exercise cards",
    route: "editDay",
    name: "Edit Day: card parity audit",
    fixture: "card-parity",
    fixtureState: "edit-day-card-parity-v2",
    headerPinned: true,
    cardParityModes: ["view", "edit", "reorder"],
    cardStates: [
      { cardId: "parity-view-row", state: "default" },
      { cardId: "parity-edit-row", state: "default", badgeText: "ORDER 1" },
      { cardId: "parity-reorder-row", state: "default", badgeText: "ORDER 1" },
    ],
  }),
  {
    id: "create-routine",
    route: "createRoutine",
    screen: "create-routine",
    family: "Exercise cards",
    name: "Create Routine",
    fixture: "default",
    fixtureState: "create-routine-v1",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 698 }),
    bottomDockLayout: "split",
    goalForm: {
      heading: "Create routine",
      fieldLabels: ["Routine name", "Days per week", "Notes"],
      helperCopy: ["Routine name appears in Today.", "Notes are optional."],
    },
    cardStates: [{ cardId: "new-routine-card", state: "selected", badgeText: "Draft" }],
    usesFloatingHeader: true,
    sectionChromeOwnedByShell: true,
  },
  {
    id: "edit-routine",
    route: "editRoutine",
    screen: "edit-routine",
    family: "Exercise cards",
    name: "Edit Routine",
    fixture: "default",
    fixtureState: "edit-routine-v1",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 698 }),
    bottomDockLayout: "split",
    cardStates: [{ cardId: "edit-routine-card", state: "selected", badgeText: "Current" }],
    usesFloatingHeader: true,
    sectionChromeOwnedByShell: true,
  },
  buildAddExerciseFixture({
    id: "add-exercise-default",
    family: "Exercise cards",
    name: "Add Exercise: default",
    fixture: "default",
    fixtureState: "add-exercise-default-v1",
    filterChipFrames: [
      { label: "Chest", left: 16, right: 82 },
      { label: "Strength", left: 90, right: 176 },
      { label: "Barbell", left: 184, right: 262 },
    ],
  }),
  buildSimpleFixture({
    id: "history-sessions-compact",
    route: "historySessions",
    screen: "history-sessions",
    family: "Session summaries",
    name: "History sessions: compact density",
    fixture: "compact",
    fixtureState: "history-sessions-compact-v1",
    cardStates: [{ cardId: "history-session-latest", state: "selected", badgeText: "Latest" }],
    historyHeaderOwnerCount: 1,
  }),
  buildSimpleFixture({
    id: "history-sessions-detailed",
    route: "historySessions",
    screen: "history-sessions",
    family: "Session summaries",
    name: "History sessions: detailed density",
    fixture: "detailed",
    fixtureState: "history-sessions-detailed-v1",
    cardStates: [{ cardId: "history-session-detailed", state: "selected", badgeText: "Latest" }],
    detailedMode: { extraMetricCount: 4, analyticsSlotsReady: true },
    historyHeaderOwnerCount: 1,
  }),
  buildSimpleFixture({
    id: "history-exercises-zero-results",
    route: "historyExercises",
    screen: "history-exercises",
    family: "Exercise cards",
    name: "History exercises: zero results",
    fixture: "zero-results",
    fixtureState: "history-exercises-zero-results-v1",
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 168 },
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-browser",
  }),
  buildSimpleFixture({
    id: "history-exercises-compact",
    route: "historyExercises",
    screen: "history-exercises",
    family: "Exercise cards",
    name: "History exercises: compact density",
    fixture: "compact",
    fixtureState: "history-exercises-compact-v1",
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 188 },
    cardStates: [{ cardId: "history-exercise-compact", state: "default" }],
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-browser",
  }),
  buildSimpleFixture({
    id: "history-exercises-detailed",
    route: "historyExercises",
    screen: "history-exercises",
    family: "Exercise cards",
    name: "History exercises: detailed analytics",
    fixture: "detailed",
    fixtureState: "history-exercises-detailed-v3",
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 188 },
    cardStates: [{ cardId: "history-exercise-latest", state: "default" }],
    detailedMode: { extraMetricCount: 3, analyticsSlotsReady: true },
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-browser",
  }),
  buildSimpleFixture({
    id: "history-exercises-media-fallback",
    route: "historyExercises",
    screen: "history-exercises",
    family: "Exercise cards",
    name: "History exercises: media fallback stress",
    fixture: "media-fallback",
    fixtureState: "history-exercises-media-fallback-v1",
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 188 },
    cardStates: [{ cardId: "history-exercise-media-fallback", state: "default" }],
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-browser",
  }),
  buildSimpleFixture({
    id: "history-exercises-cardio-taxonomy",
    route: "historyExercises",
    screen: "history-exercises",
    family: "Exercise cards",
    name: "History exercises: cardio taxonomy",
    fixture: "cardio-taxonomy",
    fixtureState: "history-exercises-cardio-taxonomy-v1",
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 188 },
    cardStates: [{ cardId: "history-exercise-cardio", state: "default" }],
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-browser",
  }),
  buildSimpleFixture({
    id: "history-detail-broken-images",
    route: "historyDetail",
    screen: "history-detail",
    family: "Session summaries",
    name: "History detail: broken images",
    fixture: "broken-images",
    fixtureState: "history-detail-broken-images-v1",
    statusChips: ["logged"],
    cardStates: [{ cardId: "history-detail-primary", state: "completed", badgeText: "Logged" }],
    historyHeaderOwnerCount: 1,
    historySurfaceToken: "history-detail",
  }),
  buildSimpleFixture({
    id: "settings-default",
    route: "settings",
    screen: "settings",
    family: "Settings / detail",
    name: "Settings: default",
    fixture: "default",
    fixtureState: "settings-default-v1",
    cardStates: [{ cardId: "settings-profile", state: "selected", badgeText: "Live" }],
  }),
  buildSimpleFixture({
    id: "exercise-detail-strength",
    route: "exerciseDetail",
    screen: "exercise-detail",
    family: "Settings / detail",
    name: "Exercise detail: strength analytics",
    fixture: "strength",
    fixtureState: "exercise-detail-strength-v2",
    libraryCardTextLayout: { titleLineCount: 3, metadataColumnWidth: 156 },
    cardStates: [{ cardId: "exercise-detail-strength", state: "default" }],
    exerciseInfoLayout: {
      mediaFullyVisible: true,
      quickMetricCount: 4,
      hasProgressBlock: true,
      hasRecentHistoryBlock: true,
      sectionOrder: ["Overview", "Performance", "Progress", "Recent History"],
      topSafePaddingRelaxed: true,
    },
  }),
  buildSimpleFixture({
    id: "exercise-detail-cardio",
    route: "exerciseDetail",
    screen: "exercise-detail",
    family: "Settings / detail",
    name: "Exercise detail: cardio analytics",
    fixture: "cardio",
    fixtureState: "exercise-detail-cardio-v2",
    libraryCardTextLayout: { titleLineCount: 3, metadataColumnWidth: 156 },
    cardStates: [{ cardId: "exercise-detail-cardio", state: "default" }],
    exerciseInfoLayout: {
      mediaFullyVisible: true,
      quickMetricCount: 4,
      hasProgressBlock: true,
      hasRecentHistoryBlock: true,
      sectionOrder: ["Overview", "Performance", "Progress", "Recent History"],
      topSafePaddingRelaxed: true,
    },
  }),
  buildSimpleFixture({
    id: "exercise-detail-bodyweight",
    route: "exerciseDetail",
    screen: "exercise-detail",
    family: "Settings / detail",
    name: "Exercise detail: bodyweight analytics",
    fixture: "bodyweight",
    fixtureState: "exercise-detail-bodyweight-v1",
    libraryCardTextLayout: { titleLineCount: 3, metadataColumnWidth: 156 },
    cardStates: [{ cardId: "exercise-detail-bodyweight", state: "default" }],
    exerciseInfoLayout: {
      mediaFullyVisible: true,
      quickMetricCount: 4,
      hasProgressBlock: true,
      hasRecentHistoryBlock: true,
      sectionOrder: ["Overview", "Performance", "Progress", "Recent History"],
      topSafePaddingRelaxed: true,
    },
  }),
  buildSimpleFixture({
    id: "exercise-detail-long-scroll",
    route: "exerciseDetail",
    screen: "exercise-detail",
    family: "Settings / detail",
    name: "Exercise detail: long scroll bottom reach",
    fixture: "long-scroll",
    fixtureState: "exercise-detail-long-scroll-v2",
    libraryCardTextLayout: { titleLineCount: 3, metadataColumnWidth: 156 },
    cardStates: [{ cardId: "exercise-detail-long-scroll", state: "default" }],
    captureScrollPosition: "bottom",
    exerciseInfoLayout: {
      mediaFullyVisible: true,
      quickMetricCount: 4,
      hasProgressBlock: true,
      hasRecentHistoryBlock: true,
      sectionOrder: ["Overview", "Performance", "Progress", "Recent History"],
      topSafePaddingRelaxed: true,
    },
  }),
] as const;

export const mobileRegressionScenarioIds = mobileRegressionScenarios.map((scenario) => scenario.id);

const defaultScenarioIdByScreen = {
  today: "today-default",
  session: "active-workout-session",
  routines: "routines-current-view",
  "view-day": "view-day",
  "edit-day": "edit-day-default",
  "create-routine": "create-routine",
  "edit-routine": "edit-routine",
  "add-exercise": "add-exercise-default",
  history: "history-sessions-compact",
  "history-sessions": "history-sessions-compact",
  "history-exercises": "history-exercises-detailed",
  "history-detail": "history-detail-broken-images",
  settings: "settings-default",
  "exercise-detail": "exercise-detail-strength",
} as const;

export function getMobileRegressionScenarioById(id?: string | null) {
  if (!id) return null;
  return mobileRegressionScenarios.find((scenario) => scenario.id === id) ?? null;
}

export function resolveMobileRegressionScenario(args: {
  scenario?: string | null;
  screen?: string | null;
  fixture?: string | null;
}) {
  const byId = getMobileRegressionScenarioById(args.scenario);
  if (byId) return byId;

  const screen = args.screen?.trim().toLowerCase();
  if (!screen) return null;
  const fixture = args.fixture?.trim().toLowerCase() || "default";

  const exactMatch = mobileRegressionScenarios.find((scenario) => scenario.screen === screen && scenario.fixture === fixture) ?? null;
  if (exactMatch) {
    return exactMatch;
  }

  if (fixture === "default") {
    const defaultScenarioId = defaultScenarioIdByScreen[screen as keyof typeof defaultScenarioIdByScreen];
    if (defaultScenarioId) {
      return getMobileRegressionScenarioById(defaultScenarioId);
    }
  }

  return null;
}
