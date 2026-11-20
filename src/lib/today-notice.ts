// Today's one floating error notice. Screens redirect here with an allow-listed `?notice=` code, never free text: the
// legacy `?error=<text>` path is gone (anyone could put any words on Today with a crafted link, and Today's own actions
// now return results instead). The page resolves the message on the server and `TodayNoticeHost` shows it, then
// strips the query (including any stale `?error=`) without a server refetch.

export const TODAY_NOTICE_MESSAGES = {
  "session-not-found": "That workout could not be found.",
  "session-load-failed": "That workout could not be loaded. Try again.",
} as const;

export type TodayNoticeCode = keyof typeof TODAY_NOTICE_MESSAGES;

export function isTodayNoticeCode(value: unknown): value is TodayNoticeCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TODAY_NOTICE_MESSAGES, value);
}

export function buildTodayNoticeHref(code: TodayNoticeCode) {
  return `/today?notice=${code}`;
}

/**
 * Read errors that mean "there is no such workout": PostgREST "no rows" (PGRST116, also another user's id filtered
 * out by user_id) and Postgres invalid_text_representation (22P02, a malformed non-UUID /session/<id>).
 */
const SESSION_NOT_FOUND_ERROR_CODES = new Set(["PGRST116", "22P02"]);

/**
 * A missing row or an id that cannot exist is "not found"; any other read error is a load failure, so a dropped
 * connection never claims the workout is gone.
 */
export function resolveMissingSessionNoticeCode(error: { code?: string | null } | null | undefined): TodayNoticeCode {
  return !error || SESSION_NOT_FOUND_ERROR_CODES.has(error.code ?? "") ? "session-not-found" : "session-load-failed";
}

export function resolveTodayNoticeMessage(args: { notice?: string | null }): string | null {
  const notice = args.notice?.trim();
  return isTodayNoticeCode(notice) ? TODAY_NOTICE_MESSAGES[notice] : null;
}
