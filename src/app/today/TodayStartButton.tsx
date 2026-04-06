"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { clearActiveSessionHint, writeActiveSessionHint } from "@/lib/session-state-sync";

async function requestSessionStart(payload: { selectedDayIndex?: number; routineId?: string; dayId?: string }) {
  const response = await fetch("/api/sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as ActionResult<{ sessionId: string }>;
  if (!response.ok && result.ok) {
    return { ok: false, error: "Could not start session" } satisfies ActionResult<{ sessionId: string }>;
  }
  return result;
}

async function requestSessionResume(payload: { sessionId: string; returnTo?: string }) {
  const response = await fetch("/api/sessions/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as ActionResult<{ href: string }>;
  if (!response.ok && result.ok) {
    return { ok: false, error: "Could not resume session" } satisfies ActionResult<{ href: string }>;
  }
  return result;
}

export function TodayStartButton({
  selectedDayIndex,
  routineId,
  dayId,
  returnTo,
  fullWidth = true,
  className,
  label = "Begin",
  sessionId,
}: {
  selectedDayIndex?: number;
  routineId?: string;
  dayId?: string;
  returnTo?: string;
  fullWidth?: boolean;
  className?: string;
  label?: string;
  sessionId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <BottomDockButton
      type="button"
      intent="positive"
      loading={isPending}
      fullWidth={fullWidth}
      className={className}
      onClick={() => {
        startTransition(async () => {
          if (sessionId) {
            const resumeResult = await requestSessionResume({ sessionId, returnTo });
            if (!resumeResult.ok || !resumeResult.data?.href) {
              clearActiveSessionHint(sessionId);
              toast.error(resumeResult.ok ? "Could not resume session" : resumeResult.error);
              router.refresh();
              return;
            }

            writeActiveSessionHint(sessionId);
            router.push(resumeResult.data.href);
            return;
          }

          const result = await requestSessionStart({ selectedDayIndex, routineId, dayId });
          if (!result.ok || !result.data?.sessionId) {
            toast.error(result.ok ? "Could not start session" : result.error);
            return;
          }
          const sessionHref = returnTo
            ? `/session/${result.data.sessionId}?returnTo=${encodeURIComponent(returnTo)}`
            : `/session/${result.data.sessionId}`;
          writeActiveSessionHint(result.data.sessionId);
          router.push(sessionHref);
        });
      }}
    >
      {isPending ? (sessionId ? "Opening…" : "Starting…") : label}
    </BottomDockButton>
  );
}
