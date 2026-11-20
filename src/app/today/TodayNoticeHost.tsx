"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export const TODAY_NOTICE_TOAST_ID = "today-notice";
const TODAY_NOTICE_QUERY_KEYS = ["error", "notice"] as const;

/**
 * Shows Today's server-resolved notice (`resolveTodayNoticeMessage`) as one persistent error notice, then removes
 * `?error=` / `?notice=` from the address with `history.replaceState`, which Next's router picks up without a server
 * refetch. (The old path toasted for 2.2 s and stripped the query with `router.replace`, whose re-render dropped the
 * page's inline notice, so the error was gone before anyone could read it.)
 */
export function TodayNoticeHost({ message }: { message: string | null }) {
  const toast = useToast();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!message || shownRef.current === message) {
      return;
    }
    shownRef.current = message;
    toast.error(message, { id: TODAY_NOTICE_TOAST_ID, persistent: true });

    const url = new URL(window.location.href);
    let changed = false;
    for (const key of TODAY_NOTICE_QUERY_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [message, toast]);

  return null;
}
