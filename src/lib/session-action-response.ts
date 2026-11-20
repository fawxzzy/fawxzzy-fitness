import type { ActionResult } from "@/lib/action-result";

// Start/Resume on Today call JSON routes. A dropped connection, a proxy 502 or an HTML 500 page is not JSON:
// `response.json()` throws, and an unhandled throw inside the button's transition reaches the app error boundary,
// which replaces the whole app (tab bar included) with "Could not load". These helpers turn every failure shape
// into a plain ActionResult so the screen keeps its shell and shows one inline error notice instead.

export const SESSION_START_FAILED_MESSAGE = "Could not start the workout. Try again.";
export const SESSION_RESUME_FAILED_MESSAGE = "Could not resume the workout. Try again.";

type JsonResponseLike = Pick<Response, "ok" | "status" | "json">;

/**
 * `unanswered: true` means the server never gave a usable answer (offline, HTML error page, malformed body), so the
 * session state is unknown: callers keep their local hints and do not refresh, they only show the error.
 */
export type SessionActionResult<T> = ActionResult<T> & { unanswered?: true };

function unanswered<T>(fallbackError: string): SessionActionResult<T> {
  return { ok: false, error: fallbackError, unanswered: true };
}

function isActionResultShape(value: unknown): value is ActionResult<unknown> {
  return Boolean(value) && typeof value === "object" && "ok" in (value as Record<string, unknown>)
    && typeof (value as { ok?: unknown }).ok === "boolean";
}

/** Reads a session route response; never throws. Non-JSON, malformed or contradictory bodies become `fallbackError`. */
export async function readSessionActionResult<T>(response: JsonResponseLike, fallbackError: string): Promise<SessionActionResult<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return unanswered<T>(fallbackError);
  }

  if (!isActionResultShape(body)) {
    return unanswered<T>(fallbackError);
  }

  if (body.ok) {
    return response.ok ? (body as ActionResult<T>) : unanswered<T>(fallbackError);
  }

  const error = typeof body.error === "string" ? body.error.trim() : "";
  return { ok: false, error: error || fallbackError };
}

/** Runs a session route request; a rejected fetch (offline, aborted, DNS) becomes `fallbackError` instead of a throw. */
export async function runSessionAction<T>(
  request: () => Promise<SessionActionResult<T>>,
  fallbackError: string,
): Promise<SessionActionResult<T>> {
  try {
    return await request();
  } catch {
    return unanswered<T>(fallbackError);
  }
}
