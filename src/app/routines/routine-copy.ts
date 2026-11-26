// Plain-word copy helpers for routine screens and routine server actions (pure, no React, no Supabase).
// - Server actions must never hand a raw database message to the in-flow notice: `toPlainActionError`
//   keeps authored copy and swaps anything that looks like a database/driver error for plain fallback copy.
// - The Free-plan routine cap is shown before submit, as one notice with an upgrade link.
import { toPlainProgressionLabel } from "@/lib/exercise-progression-state-label";
import { BASE_ROUTINE_LIMIT, ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE } from "@/lib/pro-tier-limits";

// Moved to the shared lib so every day card (Today, routine home, edit day) shows the same words; kept exported here.
export { toPlainProgressionLabel };

/** Where the Free-plan notice sends the user to upgrade (Settings, Pro access section). */
export const ROUTINE_LIMIT_UPGRADE_HREF = "/settings?section=pro";

/** Same plan name as Settings ("Free"), so the cap reads the same everywhere on routines. */
export function getRoutineLimitNoticeCopy(limit: number = BASE_ROUTINE_LIMIT) {
  return `The Free plan includes up to ${limit} routines. Upgrade to Pro to add more, or delete a routine you no longer use.`;
}

/**
 * Pre-submit cap check for the create-routine form. Mirrors the server rule in
 * `enforceRoutineCapacityForCreate`: Pro has no cap; Free counts every routine the user owns.
 * Returns null when the user can still create a routine.
 */
export function resolveRoutineLimitNotice(args: {
  accessState: "free" | "pro" | null | undefined;
  routineCount: number | null | undefined;
  limit?: number;
}): { message: string; upgradeHref: string } | null {
  const limit = args.limit ?? BASE_ROUTINE_LIMIT;
  if (args.accessState === "pro") return null;
  if (typeof args.routineCount !== "number" || !Number.isFinite(args.routineCount)) return null;
  if (args.routineCount < limit) return null;
  return { message: getRoutineLimitNoticeCopy(limit), upgradeHref: ROUTINE_LIMIT_UPGRADE_HREF };
}

/** Maps the server cap message to the routines notice copy. */
export function isRoutineLimitError(message: string | null | undefined) {
  return message === ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE;
}

const DATABASE_MESSAGE_PATTERNS: RegExp[] = [
  /schema cache/i,
  /\bcolumn\b/i,
  /\brelation\b/i,
  /\bviolates\b/i,
  /duplicate key/i,
  /permission denied/i,
  /row-level security/i,
  /\bPGRST\d*/i,
  /\bJWT\b/i,
  /fetch failed/i,
  /\bsyntax error\b/i,
  /\bnull value\b/i,
  /\bforeign key\b/i,
  /\bconstraint\b/i,
  /\bfunction\b.*\bdoes not exist\b/i,
  /\binvalid input\b/i,
  /\bpostgres/i,
  /\bsupabase\b/i,
  /\btimeout\b/i,
  /\bECONN/i,
];

type ErrorLike = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown } | string | null | undefined;

function readMessage(error: ErrorLike): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return "";
}

/** True when the error is shaped like a PostgREST/Postgres error or its text reads like one. */
export function isDatabaseError(error: ErrorLike): boolean {
  if (error && typeof error === "object") {
    if (typeof error.code === "string" && error.code.length > 0) return true;
    if (typeof error.details === "string" || typeof error.hint === "string") return true;
  }
  const message = readMessage(error);
  return DATABASE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Returns copy that is safe to show in the in-flow notice. Authored messages pass through; a missing
 * message or a database/driver message becomes `fallback` (the raw text is logged server-side only).
 */
export function toPlainActionError(error: ErrorLike, fallback: string): string {
  const message = readMessage(error).trim();
  if (!message) return fallback;
  if (isDatabaseError(error)) {
    if (typeof console !== "undefined") {
      console.error("[routines] action error mapped to plain copy", { fallback, message });
    }
    return fallback;
  }
  return message;
}

/** Applies `toPlainProgressionLabel` to recap rows, including `setLabel` when it carries the same flags. */
export function withPlainProgressionLabels<T extends { progressionStateLabel?: string | null; setLabel?: string | null }>(
  exercises: T[] | undefined,
): T[] | undefined {
  return exercises?.map((exercise) => ({
    ...exercise,
    progressionStateLabel: toPlainProgressionLabel(exercise.progressionStateLabel),
    setLabel: exercise.setLabel && exercise.setLabel === exercise.progressionStateLabel
      ? toPlainProgressionLabel(exercise.setLabel)
      : exercise.setLabel,
  }));
}

/**
 * Title for a day in the Days library: the custom name, else "Day N · Routine" (never a bare "Day").
 * The library lists days from every routine, so the routine name tells two "Day 1"s apart.
 */
export function getLibraryDayTitle(args: { title: string | null | undefined; dayIndex: number; sourceRoutineName?: string | null }) {
  const custom = (args.title ?? "").trim();
  if (custom && !/^day(\s+\d+)?$/i.test(custom)) return custom;
  const dayLabel = Number.isFinite(args.dayIndex) && args.dayIndex > 0 ? `Day ${args.dayIndex}` : custom || "Day";
  const routineName = (args.sourceRoutineName ?? "").trim();
  return routineName ? `${dayLabel} · ${routineName}` : dayLabel;
}
