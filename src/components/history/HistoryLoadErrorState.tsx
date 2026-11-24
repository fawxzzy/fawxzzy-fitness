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
 */
export function HistoryLoadErrorState({
  title,
  notice = "Check your connection and try again.",
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
    if (shownNoticeRef.current === notice) return;
    shownNoticeRef.current = notice;
    showError(notice, { id: "history-load-error", persistent: true, dismissOnRouteChange: true });
  }, [notice, showError]);

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
