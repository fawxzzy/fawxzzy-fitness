import { getTodayGlobalErrorMessage } from "@/lib/today-page-state";

// Today's one floating error notice. Other screens redirect here with an allow-listed `?notice=` code (never free
// text), and Today's own server actions may still redirect with `?error=`. The page resolves the message on the server
// and `TodayNoticeHost` shows it as a persistent notice, then strips the query without a server refetch.

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
 * A missing session row (PostgREST "no rows", code PGRST116, or another user's id filtered out by user_id) is
 * "not found"; any other read error is a load failure, so a dropped connection never claims the workout is gone.
 */
export function resolveMissingSessionNoticeCode(error: { code?: string | null } | null | undefined): TodayNoticeCode {
  return !error || error.code === "PGRST116" ? "session-not-found" : "session-load-failed";
}

export function resolveTodayNoticeMessage(args: {
  notice?: string | null;
  error?: string | null;
  hasInProgressSession: boolean;
  fetchFailed: boolean;
}): string | null {
  const notice = args.notice?.trim();
  if (isTodayNoticeCode(notice)) {
    return TODAY_NOTICE_MESSAGES[notice];
  }

  return getTodayGlobalErrorMessage({
    searchParamError: args.error,
    hasInProgressSession: args.hasInProgressSession,
    fetchFailed: args.fetchFailed,
  });
}
