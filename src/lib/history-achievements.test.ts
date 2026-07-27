import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryAchievements } from "./history-achievements.ts";

test("history achievements unlock only from deterministic completed training truth", () => {
  const achievements = buildHistoryAchievements({
    completedWorkoutCount: 12,
    bestSessionStreakCount: 2,
    prMomentCount: 1,
  });
  assert.deepEqual(
    achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id),
    ["first-workout", "ten-sessions", "first-pr"],
  );
  assert.equal(achievements.find((achievement) => achievement.id === "three-week-streak")?.unlocked, false);
});

test("history achievements stay locked for empty history", () => {
  assert.equal(buildHistoryAchievements({ completedWorkoutCount: 0, bestSessionStreakCount: 0, prMomentCount: 0 }).some((achievement) => achievement.unlocked), false);
});
