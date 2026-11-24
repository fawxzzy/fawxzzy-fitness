import Link from "next/link";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { CardEmptyState } from "@/components/ui/card-system";

/**
 * Shown at /history/<id> when that session no longer exists (deleted elsewhere, or a stale "Open session" link from
 * Progression). History review 2026-11-24: a calm card with a way back, never a blank screen or the app error page.
 */
export function HistorySessionMissingState() {
  return (
    <div data-history-session-missing="true" className="pt-2">
      <CardEmptyState
        headingLevel={2}
        title="This session is no longer here"
        body="It may have been deleted."
        action={(
          <Link href="/history" className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
            Back to History
          </Link>
        )}
      />
    </div>
  );
}
