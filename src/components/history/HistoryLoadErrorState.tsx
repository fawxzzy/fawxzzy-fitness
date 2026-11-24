"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { CardHeader, CardSurface } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * History load failure (History redesign 2026-11-23, review items 0b and 7; DESIGN-CONTRACT.md 8.3).
 *
 * The words of the error live in ONE place: the in-flow notice under the header (never red text in the body).
 * The card only names what failed and offers the two ways forward: Try again (refreshes the route) and a way back.
 * The notice only blames the connection when the browser really is offline (review 2026-11-24); a server failure
 * gets the neutral line.
 */
export const HISTORY_LOAD_ERROR_NOTICE = "Something went wrong loading history. Try again.";
export const HISTORY_OFFLINE_NOTICE = "You look offline. Check your connection and try again.";

export function resolveHistoryLoadErrorNotice(isOnline: boolean | undefined): string {
  return isOnline === false ? HISTORY_OFFLINE_NOTICE : HISTORY_LOAD_ERROR_NOTICE;
}

export function HistoryLoadErrorState({
  title,
  notice: noticeOverride,
  backHref = "/today",
  backLabel = "Go to Today",
}: {
  title: string;
  notice?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const showError = useToast().error;
  const [isRetrying, startRetry] = useTransition();
  const shownNoticeRef = useRef<string | null>(null);

  useEffect(() => {
    const notice = noticeOverride ?? resolveHistoryLoadErrorNotice(typeof navigator === "undefined" ? undefined : navigator.onLine);
    if (shownNoticeRef.current === notice) return;
    shownNoticeRef.current = notice;
    showError(notice, { id: "history-load-error", persistent: true, dismissOnRouteChange: true });
  }, [noticeOverride, showError]);

  return (
    <div data-history-load-error="true" className="pt-2">
      <CardSurface as="section">
        <CardHeader title={title} headingLevel={2} />
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={isRetrying}
            onClick={() => startRetry(() => router.refresh())}
          >
            Try again
          </AppButton>
          <Link href={backHref} className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
            {backLabel}
          </Link>
        </div>
      </CardSurface>
    </div>
  );
}
