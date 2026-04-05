export type MobileRouteKey =
  | "today"
  | "session"
  | "routines"
  | "viewDay"
  | "editDay"
  | "createRoutine"
  | "editRoutine"
  | "addExercise";

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

export type MobileFixtureScenario = {
  id: string;
  route: MobileRouteKey;
  name: string;
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
  name: string;
  fixtureState: string;
  inSessionSummary?: boolean;
  activeSession?: boolean;
  statusChips?: SessionStatusChip[];
  cardStates?: CardStateFixture[];
}) {
  return {
    id: args.id,
    route: args.activeSession ? "session" : "today",
    name: args.name,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({}),
    inSessionSummary: args.inSessionSummary,
    activeSession: args.activeSession,
    statusChips: args.statusChips,
    cardStates: args.cardStates,
    usesFloatingHeader: true,
  } satisfies MobileFixtureScenario;
}

function buildRoutinesFixture(args: {
  id: string;
  name: string;
  fixtureState: string;
  currentView: "current" | "list";
  lastInteractiveRowBottom?: number;
}) {
  return {
    id: args.id,
    route: "routines",
    name: args.name,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: args.lastInteractiveRowBottom ?? 700 }),
    currentView: args.currentView,
    cardStates: [{ cardId: "routine-card-primary", state: "selected", badgeText: "Current" }],
    usesFloatingHeader: true,
  } satisfies MobileFixtureScenario;
}

function buildDayFixture(args: {
  id: string;
  route: "viewDay" | "editDay";
  name: string;
  fixtureState: string;
  restDay?: boolean;
  reorderText?: ReorderTextFixture;
  goalForm?: GoalFormReadabilityFixture;
  cardStates?: CardStateFixture[];
}) {
  return {
    id: args.id,
    route: args.route,
    name: args.name,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 696 }),
    restDay: args.restDay,
    reorderText: args.reorderText,
    goalForm: args.goalForm,
    cardStates: args.cardStates,
    usesFloatingHeader: true,
  } satisfies MobileFixtureScenario;
}

function buildAddExerciseFixture(args: {
  id: string;
  name: string;
  fixtureState: string;
  filterChipFrames: FilterChipFrame[];
  goalForm?: GoalFormReadabilityFixture;
}) {
  return {
    id: args.id,
    route: "addExercise",
    name: args.name,
    fixtureState: args.fixtureState,
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 700 }),
    filterChipFrames: args.filterChipFrames,
    goalForm: args.goalForm,
    libraryCardTextLayout: { titleLineCount: 2, metadataColumnWidth: 172 },
    usesFloatingHeader: true,
  } satisfies MobileFixtureScenario;
}

export const mobileRegressionScenarios: readonly MobileFixtureScenario[] = [
  buildWorkoutFixture({
    id: "today-default",
    name: "Today: default",
    fixtureState: "today-default-v1",
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "today-overview", state: "selected", badgeText: "Today" }],
  }),
  buildWorkoutFixture({
    id: "today-in-session-summary",
    name: "Today: in-session summary",
    fixtureState: "today-in-session-summary-v1",
    inSessionSummary: true,
    statusChips: ["logged"],
    cardStates: [{ cardId: "session-summary", state: "completed", badgeText: "Logged" }],
  }),
  buildWorkoutFixture({
    id: "active-workout-session",
    name: "Active workout session",
    fixtureState: "workout-active-v1",
    activeSession: true,
    statusChips: ["in-progress"],
    cardStates: [{ cardId: "exercise-row-primary", state: "active", badgeText: "In Session" }],
  }),
  buildRoutinesFixture({
    id: "routines-current-view",
    name: "Routines: current view",
    fixtureState: "routines-current-v1",
    currentView: "current",
  }),
  buildRoutinesFixture({
    id: "routines-list-view",
    name: "Routines: list view",
    fixtureState: "routines-list-v1",
    currentView: "list",
  }),
  buildDayFixture({
    id: "view-day",
    route: "viewDay",
    name: "View Day",
    fixtureState: "view-day-v1",
    cardStates: [{ cardId: "planned-row-1", state: "default" }],
  }),
  buildDayFixture({
    id: "edit-day-default",
    route: "editDay",
    name: "Edit Day: default",
    fixtureState: "edit-day-default-v1",
    cardStates: [{ cardId: "editable-row-1", state: "selected", badgeText: "Editing" }],
  }),
  buildDayFixture({
    id: "edit-day-reorder",
    route: "editDay",
    name: "Edit Day: reorder",
    fixtureState: "edit-day-reorder-v1",
    reorderText: {
      heading: "Reorder exercises",
      dragHandleLabel: "Drag handle",
      items: ["1. Back Squat", "2. Romanian Deadlift", "3. Walking Lunge"],
    },
    cardStates: [{ cardId: "editable-row-reorder", state: "active", badgeText: "Reordering" }],
  }),
  buildDayFixture({
    id: "edit-day-rest",
    route: "editDay",
    name: "Edit Day: rest",
    fixtureState: "edit-day-rest-v1",
    restDay: true,
    cardStates: [{ cardId: "rest-day-card", state: "empty", badgeText: "Rest" }],
  }),
  buildDayFixture({
    id: "edit-day-edit-exercise",
    route: "editDay",
    name: "Edit Day: edit exercise",
    fixtureState: "edit-day-edit-exercise-v1",
    goalForm: {
      heading: "Edit exercise goal",
      fieldLabels: ["Target reps", "Target weight", "Weight unit"],
      helperCopy: ["Use realistic numbers.", "Changes save automatically."],
    },
    cardStates: [{ cardId: "editable-row-goal", state: "selected", badgeText: "Editing" }],
  }),
  buildDayFixture({
    id: "edit-day-add-exercise",
    route: "editDay",
    name: "Edit Day: add exercise",
    fixtureState: "edit-day-add-exercise-v1",
    cardStates: [{ cardId: "add-exercise-entry", state: "default" }],
  }),
  {
    id: "create-routine",
    route: "createRoutine",
    name: "Create Routine",
    fixtureState: "create-routine-v1",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 698 }),
    goalForm: {
      heading: "Create routine",
      fieldLabels: ["Routine name", "Days per week", "Notes"],
      helperCopy: ["Routine name appears in Today.", "Notes are optional."],
    },
    cardStates: [{ cardId: "new-routine-card", state: "selected", badgeText: "Draft" }],
    usesFloatingHeader: true,
  },
  {
    id: "edit-routine",
    route: "editRoutine",
    name: "Edit Routine",
    fixtureState: "edit-routine-v1",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 698 }),
    cardStates: [{ cardId: "edit-routine-card", state: "selected", badgeText: "Current" }],
    usesFloatingHeader: true,
  },
  buildAddExerciseFixture({
    id: "add-exercise-default",
    name: "Add Exercise: default",
    fixtureState: "add-exercise-default-v1",
    filterChipFrames: [
      { label: "Chest", left: 16, right: 82 },
      { label: "Strength", left: 90, right: 176 },
      { label: "Barbell", left: 184, right: 262 },
    ],
  }),
] as const;
