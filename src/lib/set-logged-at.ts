/**
 * Which instant a logged set is stamped with (`sets.logged_at`).
 *
 * Observed rest (src/lib/recovery-timing.ts) is the gap between consecutive `logged_at` values. A set
 * logged offline is replayed later, so stamping it with the server's clock at replay time would put a
 * whole queue of sets within milliseconds of each other and erase the real rest. The offline queue
 * already records when the member tapped (`createdAt`); the server accepts that instant when it is
 * plausible and otherwise keeps its own clock. No schema change: `logged_at` already exists.
 */

/** A device clock may run a little ahead of the server. */
export const SET_LOGGED_AT_MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;
/** A queued set older than this is stamped at replay time instead (stale queue, wrong clock). */
export const SET_LOGGED_AT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

export function resolveSetLoggedAt(candidate: unknown, nowIso: string): string {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return nowIso;
  }

  const candidateMs = Date.parse(candidate);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(candidateMs) || !Number.isFinite(nowMs)) {
    return nowIso;
  }
  if (candidateMs > nowMs + SET_LOGGED_AT_MAX_FUTURE_SKEW_MS || candidateMs < nowMs - SET_LOGGED_AT_MAX_AGE_MS) {
    return nowIso;
  }

  return new Date(Math.min(candidateMs, nowMs)).toISOString();
}
