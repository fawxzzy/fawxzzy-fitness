export const EXERCISE_TIMER_MAX_SECONDS = 24 * 60 * 60;

export type ExerciseTimerMode = "count_up" | "countdown";
export type ExerciseTimerStatus = "idle" | "running" | "paused" | "completed";
export type ExerciseTimerCommand = "enable" | "disable" | "start" | "pause" | "reset" | "complete";

export type ExerciseTimerSnapshot = {
  enabled: boolean;
  mode: ExerciseTimerMode | null;
  targetSeconds: number | null;
  elapsedSeconds: number;
  status: ExerciseTimerStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export function parseExerciseTimerConfig(input: {
  enabled: boolean;
  mode: unknown;
  targetSeconds: unknown;
}) {
  if (!input.enabled) {
    return { ok: true as const, config: null };
  }
  const mode: ExerciseTimerMode | null = input.mode === "count_up" || input.mode === "countdown" ? input.mode : null;
  const targetSeconds = mode === "countdown" ? normalizeExerciseTimerSeconds(input.targetSeconds) : null;
  if (!mode || (mode === "countdown" && (!targetSeconds || targetSeconds < 1))) {
    return { ok: false as const, error: "Choose a valid exercise timer mode and target." };
  }
  return { ok: true as const, config: { mode, targetSeconds } };
}

export function normalizeExerciseTimerSeconds(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(EXERCISE_TIMER_MAX_SECONDS, Math.max(0, Math.floor(parsed)));
}

export function getExerciseTimerElapsedSeconds(snapshot: ExerciseTimerSnapshot, nowMs = Date.now()) {
  const base = normalizeExerciseTimerSeconds(snapshot.elapsedSeconds) ?? 0;
  if (snapshot.status !== "running" || !snapshot.startedAt) {
    return base;
  }

  const startedAtMs = Date.parse(snapshot.startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return base;
  }

  return Math.min(
    EXERCISE_TIMER_MAX_SECONDS,
    base + Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)),
  );
}

export function getExerciseTimerDisplaySeconds(snapshot: ExerciseTimerSnapshot, nowMs = Date.now()) {
  const elapsed = getExerciseTimerElapsedSeconds(snapshot, nowMs);
  if (snapshot.mode === "countdown" && snapshot.targetSeconds) {
    return Math.max(0, snapshot.targetSeconds - elapsed);
  }
  return elapsed;
}

export function isExerciseTimerTargetComplete(snapshot: ExerciseTimerSnapshot, nowMs = Date.now()) {
  return Boolean(
    snapshot.mode === "countdown"
    && snapshot.targetSeconds
    && getExerciseTimerElapsedSeconds(snapshot, nowMs) >= snapshot.targetSeconds,
  );
}

export function formatExerciseTimerClock(totalSeconds: number) {
  const safeSeconds = normalizeExerciseTimerSeconds(totalSeconds) ?? 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function applyExerciseTimerCommand(
  snapshot: ExerciseTimerSnapshot,
  command: ExerciseTimerCommand,
  nowIso: string,
): ExerciseTimerSnapshot {
  if (!snapshot.enabled || !snapshot.mode) {
    return snapshot;
  }

  const nowMs = Date.parse(nowIso);
  const elapsedSeconds = getExerciseTimerElapsedSeconds(snapshot, nowMs);

  if (command === "reset") {
    return { ...snapshot, elapsedSeconds: 0, status: "idle", startedAt: null, completedAt: null };
  }
  if (command === "pause") {
    return { ...snapshot, elapsedSeconds, status: "paused", startedAt: null, completedAt: null };
  }
  if (command === "complete") {
    return { ...snapshot, elapsedSeconds, status: "completed", startedAt: null, completedAt: nowIso };
  }
  if (snapshot.status === "completed") {
    return { ...snapshot, elapsedSeconds: 0, status: "running", startedAt: nowIso, completedAt: null };
  }
  return { ...snapshot, status: "running", startedAt: nowIso, completedAt: null };
}
