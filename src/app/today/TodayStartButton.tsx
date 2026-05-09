"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { clearActiveSessionHint, writeActiveSessionHint } from "@/lib/session-state-sync";
import {
  clearProgressionAppliedPinsForRoutineDay,
  getPendingProgressionAppliedPinsForRoutineDay,
  getProgressionAppliedPinsStorageKey,
  pruneExpiredProgressionAppliedPins,
  type ProgressionAppliedPin,
} from "@/lib/progression-applied-pins";

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
  label = "Start",
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
  const [confirmLockInOpen, setConfirmLockInOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function readPendingPinsForDay() {
    if (!routineId || !dayId || typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.sessionStorage.getItem(getProgressionAppliedPinsStorageKey(routineId));
      const pins = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      return getPendingProgressionAppliedPinsForRoutineDay({
        pins: Array.isArray(pins) ? pins : [],
        routineDayId: dayId,
      });
    } catch {
      return [];
    }
  }

  function clearPinsForDay() {
    if (!routineId || !dayId || typeof window === "undefined") {
      return;
    }

    try {
      const storageKey = getProgressionAppliedPinsStorageKey(routineId);
      const raw = window.sessionStorage.getItem(storageKey);
      const pins = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      const nextPins = pruneExpiredProgressionAppliedPins(clearProgressionAppliedPinsForRoutineDay({
        pins: Array.isArray(pins) ? pins : [],
        routineDayId: dayId,
      }));
      if (nextPins.length > 0) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(nextPins));
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      // Bad local pin state should not block a user from starting a workout.
    }
  }

  function startOrResumeSession() {
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
  }

  return (
    <>
      <BottomDockButton
        type="button"
        intent="positive"
        loading={isPending}
        fullWidth={fullWidth}
        className={className}
        onClick={() => {
          if (!sessionId && readPendingPinsForDay().length > 0) {
            setConfirmLockInOpen(true);
            return;
          }

          startOrResumeSession();
        }}
      >
        {isPending ? (sessionId ? "Opening..." : "Starting...") : label}
      </BottomDockButton>
      <ConfirmDestructiveModal
        open={confirmLockInOpen}
        title="Lock in applied progression updates?"
        consequenceText="Starting this workout will keep the promoted targets and clear quick undo for this day."
        confirmLabel="Lock In"
        confirmActionLabel="Lock In"
        cancelLabel="Keep Revert"
        confirmVariant="primary"
        titleVariant="raw"
        isLoading={isPending}
        onCancel={() => setConfirmLockInOpen(false)}
        onConfirm={() => {
          clearPinsForDay();
          setConfirmLockInOpen(false);
          startOrResumeSession();
        }}
      />
    </>
  );
}
