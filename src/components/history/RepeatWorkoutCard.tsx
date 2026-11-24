"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { CardHeader, CardSurface, cardTokens } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import {
  REPEAT_WORKOUT_FAILED_MESSAGE,
  REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
  REPEAT_WORKOUT_OFFLINE_MESSAGE,
} from "@/lib/repeat-workout";
import { readSessionActionResult, runSessionAction } from "@/lib/session-action-response";
import { isSessionExpiredResponse, redirectToLoginForExpiredSession } from "@/lib/session-expired-client";
import { writeActiveSessionHint } from "@/lib/session-state-sync";

async function requestRepeat(sessionId: string) {
  return runSessionAction<{ sessionId: string; resumed: boolean }>(async () => {
    const response = await fetch("/api/sessions/repeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (isSessionExpiredResponse(response.status)) {
      redirectToLoginForExpiredSession();
      return { ok: false, error: "Your session has expired. Sign in again." };
    }

    return readSessionActionResult<{ sessionId: string; resumed: boolean }>(response, REPEAT_WORKOUT_FAILED_MESSAGE);
  }, REPEAT_WORKOUT_FAILED_MESSAGE);
}

/**
 * History session detail: start a new workout for the day this one came from. The new workout is built from the
 * day's current exercises and goals (the same start Today uses); this finished workout is never changed.
 * Failures and the "already in progress" case go through the notice system, never red text on the card.
 */
export function RepeatWorkoutCard({
  sessionId,
  dayLabel,
  available,
  unavailableReason,
}: {
  sessionId: string;
  dayLabel: string;
  available: boolean;
  unavailableReason?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const noteId = useId();
  const day = dayLabel.trim() || "this day";

  function repeat() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error(REPEAT_WORKOUT_OFFLINE_MESSAGE);
      return;
    }

    startTransition(async () => {
      const result = await requestRepeat(sessionId);
      if (!result.ok || !result.data?.sessionId) {
        toast.error(result.ok ? REPEAT_WORKOUT_FAILED_MESSAGE : result.error);
        return;
      }

      if (result.data.resumed) {
        toast.info(REPEAT_WORKOUT_IN_PROGRESS_MESSAGE, { durationMs: 5000 });
      }
      writeActiveSessionHint(result.data.sessionId);
      router.push(`/session/${result.data.sessionId}?returnTo=${encodeURIComponent("/today")}`);
    });
  }

  return (
    <CardSurface showRail={false} data-history-repeat-card="true" data-repeat-available={available ? "true" : "false"}>
      <CardHeader headingLevel={2} title="Repeat workout" />
      <div className={cn(cardTokens.body, "grid gap-3 pb-4")}>
        <p id={noteId} className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">
          {available
            ? `Start a new workout for ${day} with your current goals. This workout stays as logged.`
            : (unavailableReason ?? "This workout cannot be repeated.")}
        </p>
        <AppButton
          type="button"
          variant="primary"
          size="sm"
          fullWidth
          loading={isPending}
          disabled={!available}
          aria-describedby={noteId}
          onClick={repeat}
        >
          Repeat workout
        </AppButton>
      </div>
    </CardSurface>
  );
}
