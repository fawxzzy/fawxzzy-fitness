import type { SetFlowDirection } from "@/lib/set-flow-directions";

export type RoutineDayCardCounts = {
  total?: number;
  strength: number;
  cardio: number;
  bodyweight: number;
  unknown: number;
};

export function formatRoutineDayExerciseCountLabel(total: number | null | undefined) {
  const safeTotal = Number.isFinite(total ?? null) ? Math.max(0, Math.floor(total as number)) : 0;
  if (safeTotal <= 0) {
    return "No exercises";
  }

  return `${safeTotal} ${safeTotal === 1 ? "exercise" : "exercises"}`;
}

export function resolveRoutineDayExerciseDescriptor(summary: RoutineDayCardCounts) {
  const total = Number.isFinite(summary.total ?? null)
    ? Math.max(0, Math.floor(summary.total as number))
    : Math.max(0, summary.strength + summary.cardio + summary.bodyweight + summary.unknown);

  if (total <= 0) {
    return null;
  }

  const primaryKinds = [
    { key: "strength", count: summary.strength, focused: "Strength-focused", heavy: "Strength-heavy" },
    { key: "cardio", count: summary.cardio, focused: "Cardio-focused", heavy: "Cardio-heavy" },
    { key: "bodyweight", count: summary.bodyweight, focused: "Bodyweight-focused", heavy: "Bodyweight-heavy" },
  ] as const;

  const activePrimaryKinds = primaryKinds.filter((entry) => entry.count > 0);
  if (activePrimaryKinds.length === 1 && summary.unknown === 0) {
    return activePrimaryKinds[0]!.focused;
  }

  const dominantPrimaryKind = primaryKinds.find((entry) => entry.count / total >= 0.6);
  if (dominantPrimaryKind) {
    return dominantPrimaryKind.heavy;
  }

  return "Mixed";
}

export function resolveRoutineDayAdjustmentIndicator(direction: SetFlowDirection | null | undefined) {
  return direction === "up" || direction === "down" ? direction : null;
}
