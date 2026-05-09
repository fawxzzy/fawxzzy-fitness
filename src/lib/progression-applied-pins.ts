import type { ProgressionReviewDisplayItem } from "@/lib/progression-review-display";
import type { ProgressionReviewLinkedTargetSnapshot } from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

export const PROGRESSION_APPLIED_PIN_TTL_MS = 24 * 60 * 60 * 1000;
export const PROGRESSION_APPLIED_PINS_CHANGED_EVENT = "fitness:progression-applied-pins:changed";
const PROGRESSION_APPLIED_PIN_STORAGE_KEY_PREFIX = "fitness:progression-applied-pins:";

export type ProgressionAppliedPin = {
  routineDayExerciseId: string;
  item: ProgressionReviewDisplayItem;
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
  linkedTargets?: ProgressionReviewLinkedTargetSnapshot[];
  sourceSessionId?: string | null;
  lifecycleState?: "pending_revert" | "stale_source_deleted";
  appliedAt: number;
  expiresAt: number;
};

export function getProgressionAppliedPinsStorageKey(routineId: string) {
  return `${PROGRESSION_APPLIED_PIN_STORAGE_KEY_PREFIX}${routineId}`;
}

export function pruneExpiredProgressionAppliedPins(pins: ProgressionAppliedPin[], now = Date.now()) {
  return pins.filter((pin) => pin.expiresAt > now);
}

export function progressionAppliedPinTouchesRoutineDay(pin: ProgressionAppliedPin, routineDayId: string) {
  if (pin.item.dayGroupId === routineDayId) {
    return true;
  }

  return pin.item.linkedUpdate?.targets.some((target) => target.dayGroupId === routineDayId) === true;
}

export function getPendingProgressionAppliedPinsForRoutineDay(args: {
  pins: ProgressionAppliedPin[];
  routineDayId?: string | null;
}) {
  if (!args.routineDayId) {
    return [];
  }

  return pruneExpiredProgressionAppliedPins(args.pins)
    .filter((pin) => (pin.lifecycleState ?? "pending_revert") === "pending_revert")
    .filter((pin) => progressionAppliedPinTouchesRoutineDay(pin, args.routineDayId!));
}

export function clearProgressionAppliedPinsForRoutineDay(args: {
  pins: ProgressionAppliedPin[];
  routineDayId?: string | null;
}) {
  if (!args.routineDayId) {
    return args.pins;
  }

  return args.pins.filter((pin) => !progressionAppliedPinTouchesRoutineDay(pin, args.routineDayId!));
}

function getTargetSnapshotKey(target: ProgressionTargetPlan | null | undefined) {
  if (!target) {
    return "none";
  }

  return JSON.stringify({
    measurementType: target.measurementType,
    setsMin: target.setsMin ?? null,
    setsMax: target.setsMax ?? null,
    repsTarget: target.repsTarget ?? null,
    repsMin: target.repsMin ?? null,
    repsMax: target.repsMax ?? null,
    weightMin: target.weightMin ?? null,
    weightMax: target.weightMax ?? null,
    weightUnit: target.weightUnit ?? null,
    durationSeconds: target.durationSeconds ?? null,
    distance: target.distance ?? null,
    distanceUnit: target.distanceUnit ?? null,
    calories: target.calories ?? null,
  });
}

export function finalizeAppliedPinsForCurrentTargets(args: {
  pins: ProgressionAppliedPin[];
  items: ProgressionReviewDisplayItem[];
}) {
  const currentTargetKeyById = new Map(
    args.items.map((item) => [item.id, getTargetSnapshotKey(item.currentTarget)]),
  );

  return args.pins.filter((pin) => {
    const currentTargetKey = currentTargetKeyById.get(pin.routineDayExerciseId);
    return currentTargetKey !== getTargetSnapshotKey(pin.appliedTarget);
  });
}

export function buildProgressionAppliedPin(args: {
  item: ProgressionReviewDisplayItem;
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
  linkedTargets?: ProgressionReviewLinkedTargetSnapshot[];
  now?: number;
}): ProgressionAppliedPin {
  const appliedAt = args.now ?? Date.now();

  return {
    routineDayExerciseId: args.item.id,
    item: {
      ...args.item,
      reason: "Applied. Undo available until workout starts.",
      actionLabel: "Revert",
    },
    previousTarget: args.previousTarget,
    appliedTarget: args.appliedTarget,
    linkedTargets: args.linkedTargets,
    sourceSessionId: args.item.sourceSession?.sessionId ?? null,
    lifecycleState: "pending_revert",
    appliedAt,
    expiresAt: appliedAt + PROGRESSION_APPLIED_PIN_TTL_MS,
  };
}

export function markProgressionAppliedPinsSourceDeleted(args: {
  pins: ProgressionAppliedPin[];
  deletedSessionId: string;
}) {
  return args.pins.map((pin) => pin.sourceSessionId === args.deletedSessionId
    ? {
        ...pin,
        lifecycleState: "stale_source_deleted" as const,
        item: {
          ...pin.item,
          reason: "Source session was removed. Recheck this update.",
        },
      }
    : pin);
}

export function markProgressionAppliedPinsSourceDeletedInStorage(deletedSessionId: string) {
  if (typeof window === "undefined" || !deletedSessionId.trim()) {
    return;
  }

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith(PROGRESSION_APPLIED_PIN_STORAGE_KEY_PREFIX)) {
      continue;
    }

    try {
      const raw = window.sessionStorage.getItem(key);
      const pins = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      if (!Array.isArray(pins)) {
        continue;
      }

      window.sessionStorage.setItem(key, JSON.stringify(markProgressionAppliedPinsSourceDeleted({
        pins,
        deletedSessionId,
      })));
    } catch {
      // Ignore malformed local undo state; server truth still recomputes after deletion.
    }
  }
}

export function upsertProgressionAppliedPin(pins: ProgressionAppliedPin[], pin: ProgressionAppliedPin) {
  return [
    pin,
    ...pins.filter((current) => current.routineDayExerciseId !== pin.routineDayExerciseId),
  ];
}

export function removeProgressionAppliedPin(pins: ProgressionAppliedPin[], routineDayExerciseId: string) {
  return pins.filter((pin) => pin.routineDayExerciseId !== routineDayExerciseId);
}

export function mergeProgressionAppliedPinsWithItems(args: {
  items: ProgressionReviewDisplayItem[];
  pins: ProgressionAppliedPin[];
}) {
  const pinnedIds = new Set(args.pins.map((pin) => pin.routineDayExerciseId));
  const pinnedItems = args.pins.map((pin) => pin.item);
  const unpinnedItems = args.items.filter((item) => !pinnedIds.has(item.id));

  return [...pinnedItems, ...unpinnedItems];
}
