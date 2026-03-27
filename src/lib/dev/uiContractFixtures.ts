export type HeaderFixture = {
  id: string;
  recipe: "todayOverview" | "routinesOverview" | "exerciseLog" | "editDay" | "viewDay";
  eyebrow: string;
  title: string;
  subtitle: string;
  winnerNote: string;
};

export type ExerciseCardFixture = {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  state: "default" | "selected" | "active" | "completed" | "empty";
  winnerNote: string;
};

export type PlannedWorkoutFixture = {
  id: string;
  label: string;
  subtitle: string;
  badgeText?: string;
  state: "default" | "selected" | "active" | "completed" | "empty";
  winnerNote: string;
};

export const uiContractFixtures = {
  headers: [
    {
      id: "today",
      recipe: "todayOverview",
      eyebrow: "Shared Header",
      title: "Today",
      subtitle: "Current routine • Day 2",
      winnerNote: "Winner: page-family spacing + title rhythm from one recipe.",
    },
    {
      id: "exercise-log",
      recipe: "exerciseLog",
      eyebrow: "Shared Header",
      title: "Exercise Log",
      subtitle: "Paused Bench Press • Set 3",
      winnerNote: "Winner: log identity stays aligned with session/editor siblings.",
    },
    {
      id: "editor",
      recipe: "editDay",
      eyebrow: "Shared Header",
      title: "Edit Day",
      subtitle: "Monday • 5 planned workouts",
      winnerNote: "Winner: editor headers stop drifting from detail/session chrome.",
    },
    {
      id: "detail",
      recipe: "viewDay",
      eyebrow: "Shared Header",
      title: "View Day",
      subtitle: "Thursday • Strength focus",
      winnerNote: "Winner: detail-screen title/subtitle hierarchy remains canonical.",
    },
  ] as HeaderFixture[],

  currentSessionCards: [
    {
      id: "selected",
      title: "Paused Bench Press",
      subtitle: "Goal: 3 × 5 @ 185 lb",
      badgeText: "Selected",
      state: "selected",
      winnerNote: "Winner: selected card is obvious before reading supporting copy.",
    },
    {
      id: "active",
      title: "Barbell Row",
      subtitle: "2/4 sets logged • last set 185 × 6",
      badgeText: "In Session",
      state: "active",
      winnerNote: "Winner: in-session state reads consistently across list families.",
    },
    {
      id: "completed",
      title: "Romanian Deadlift",
      subtitle: "Completed • PR: 275 × 8",
      badgeText: "Completed",
      state: "completed",
      winnerNote: "Winner: completion contrast survives list density changes.",
    },
  ] as ExerciseCardFixture[],

  plannedWorkoutVariants: [
    {
      id: "default",
      label: "Incline Dumbbell Press",
      subtitle: "4 sets • reps + weight",
      state: "default",
      winnerNote: "Winner: default planned row shares canonical shell with session rows.",
    },
    {
      id: "selected",
      label: "Cable Fly",
      subtitle: "Inline editing open",
      badgeText: "Editing",
      state: "selected",
      winnerNote: "Winner: edit focus state is unambiguous.",
    },
    {
      id: "rest-day",
      label: "Rest Day",
      subtitle: "No planned workouts",
      badgeText: "Rest",
      state: "empty",
      winnerNote: "Winner: rest-day contract is visible and deterministic.",
    },
  ] as PlannedWorkoutFixture[],

  exerciseLog: {
    title: "Paused Bench Press",
    subtitle: "Set 3 of 5 • target 5 reps",
    summary: {
      reps: 5,
      weight: 185,
      weightUnit: "lb",
      durationSeconds: null,
      distance: null,
      distanceUnit: "mi",
      calories: null,
    },
    loggedSets: ["Set 1 • 185 × 5", "Set 2 • 185 × 5", "Set 3 • 185 × 5"],
    winnerNote: "Winner: one shared identity + measurement language across log/edit/add.",
  },

  configureGoal: {
    title: "Configure Goal",
    summary: {
      reps: 8,
      weight: 60,
      weightUnit: "lb",
      durationSeconds: 0,
      distance: null,
      distanceUnit: "mi",
      calories: null,
    },
    winnerNote: "Winner: deterministic summary chips expose copy/styling drift instantly.",
  },

  editDayInlineEditor: {
    title: "Edit Day inline editor",
    subtitle: "Single-item editor remains visually attached to the selected row.",
    winnerNote: "Winner: row actions + inline form keep one ownership surface.",
  },

  viewDay: {
    title: "View Day",
    subtitle: "Thursday • Push Focus",
    winnerNote: "Winner: view-state summary + planned rows stay in the same shell family.",
  },
};
