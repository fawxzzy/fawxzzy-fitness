export type HistoryAchievement = {
  id: "first-workout" | "ten-sessions" | "three-week-streak" | "first-pr";
  title: string;
  description: string;
  unlocked: boolean;
};

export function buildHistoryAchievements(input: {
  completedWorkoutCount: number;
  bestSessionStreakCount: number;
  prMomentCount: number;
}): HistoryAchievement[] {
  return [
    {
      id: "first-workout",
      title: "First Workout",
      description: "Complete one workout.",
      unlocked: input.completedWorkoutCount >= 1,
    },
    {
      id: "ten-sessions",
      title: "Ten Sessions",
      description: "Complete ten workouts over time.",
      unlocked: input.completedWorkoutCount >= 10,
    },
    {
      id: "three-week-streak",
      title: "Three Session Streak",
      description: "Log three consecutive planned workout days.",
      unlocked: input.bestSessionStreakCount >= 3,
    },
    {
      id: "first-pr",
      title: "PR Logged",
      description: "Record one history-backed PR moment.",
      unlocked: input.prMomentCount >= 1,
    },
  ];
}
