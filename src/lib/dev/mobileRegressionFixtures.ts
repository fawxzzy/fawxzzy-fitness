export type MobileRouteKey = "today" | "session" | "addExercise" | "exerciseDetail";

export type ScreenGeometry = {
  viewportWidth: number;
  viewportHeight: number;
  safeAreaTop: number;
  dockTop: number;
  lastInteractiveRowBottom: number;
  titleTop: number;
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

export type MobileFixtureScenario = {
  id: string;
  route: MobileRouteKey;
  name: string;
  geometry: ScreenGeometry;
  dayPickerOpen?: boolean;
  restDay?: boolean;
  inSessionSummary?: boolean;
  activeSession?: boolean;
  filtersExpanded?: boolean;
  goalConfiguration?: boolean;
  filterChipFrames?: FilterChipFrame[];
  libraryCardTextLayout?: LibraryCardTextLayout;
  statusChips?: SessionStatusChip[];
  allowLoggedAndSkipped?: boolean;
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
    ...overrides,
  };
}

export const mobileRegressionScenarios: readonly MobileFixtureScenario[] = [
  {
    id: "today-selected-day",
    route: "today",
    name: "Today: selected day",
    geometry: withBaseGeometry({}),
    statusChips: ["in-progress"],
  },
  {
    id: "today-day-picker-open",
    route: "today",
    name: "Today: day picker open",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 686 }),
    dayPickerOpen: true,
  },
  {
    id: "today-rest-day",
    route: "today",
    name: "Today: rest day",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 664 }),
    restDay: true,
  },
  {
    id: "today-in-session-summary",
    route: "today",
    name: "Today: in-session summary",
    geometry: withBaseGeometry({}),
    inSessionSummary: true,
    statusChips: ["logged"],
  },
  {
    id: "active-workout-session",
    route: "session",
    name: "Active workout session",
    geometry: withBaseGeometry({}),
    activeSession: true,
    statusChips: ["in-progress"],
  },
  {
    id: "add-exercise-default",
    route: "addExercise",
    name: "Add Exercise: default",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 702 }),
    filterChipFrames: [
      { label: "Chest", left: 16, right: 82 },
      { label: "Strength", left: 90, right: 176 },
      { label: "Barbell", left: 184, right: 262 },
    ],
  },
  {
    id: "add-exercise-filters-expanded",
    route: "addExercise",
    name: "Add Exercise: filters expanded",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 694 }),
    filtersExpanded: true,
    filterChipFrames: [
      { label: "Upper Body", left: 16, right: 118 },
      { label: "Dumbbell", left: 126, right: 220 },
      { label: "Compound", left: 228, right: 325 },
    ],
  },
  {
    id: "add-exercise-long-title-metadata",
    route: "addExercise",
    name: "Add Exercise: long-title / long-metadata library cards",
    geometry: withBaseGeometry({}),
    libraryCardTextLayout: {
      titleLineCount: 2,
      metadataColumnWidth: 172,
    },
  },
  {
    id: "add-exercise-goal-configuration",
    route: "addExercise",
    name: "Add Exercise: goal configuration",
    geometry: withBaseGeometry({ lastInteractiveRowBottom: 700 }),
    goalConfiguration: true,
    statusChips: ["logged"],
  },
  {
    id: "exercise-detail-view",
    route: "exerciseDetail",
    name: "Exercise detail/view screen",
    geometry: withBaseGeometry({}),
  },
] as const;
