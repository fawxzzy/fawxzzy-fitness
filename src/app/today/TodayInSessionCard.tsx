"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CardHeader, CardMeta, CardSurface } from "@/components/ui/card-system";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/ToastProvider";
import { friendlyActionError } from "@/lib/action-error-copy";
import { CONFIRM_ACTION_LABELS } from "@/lib/action-labels";
import { isRedirectError } from "@/lib/next-navigation-errors";

export function formatTodayInSessionMeta(loggedSetCount: number): string {
  const count = Number.isFinite(loggedSetCount) && loggedSetCount > 0 ? Math.floor(loggedSetCount) : 0;
  if (count === 0) return "No sets logged yet";
  return `${count} ${count === 1 ? "set" : "sets"} logged`;
}

/**
 * Today while a workout is open (wave 2 "Start fast"): one card says so, and Discard moves off the bottom dock into
 * this card's ⋯ menu so the dock keeps ONE primary (Resume workout). The confirm still guards Discard. Same submit
 * rules as ConfirmedServerFormButton: the action runs as a form action (its redirect to /today navigates), a double
 * tap on the confirm submits once, and a failure closes the dialog, shows the in-flow notice and refreshes.
 */
export function TodayInSessionCard({
  sessionId,
  dayName,
  loggedSetCount,
  action,
  failureMessage,
}: {
  sessionId: string;
  /** The workout's day ("Push A"); the meta line leads with it. */
  dayName: string | null;
  loggedSetCount: number;
  action: (formData: FormData) => unknown | Promise<unknown>;
  failureMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const toast = useToast();
  const router = useRouter();

  const fail = (message: string) => {
    setOpen(false);
    toast.error(message);
    router.refresh();
  };

  return (
    <CardSurface tone="current" data-today-in-session-card="true">
      <form
        ref={formRef}
        action={async (formData) => {
          setIsLoading(true);
          try {
            const result = await action(formData);
            if (typeof result === "object" && result !== null && "ok" in result) {
              const typed = result as { ok?: unknown; error?: unknown };
              if (typed.ok === false) {
                const error = typeof typed.error === "string" ? typed.error.trim() : "";
                fail(friendlyActionError(error, failureMessage, { refreshes: true }));
                return;
              }
              if (typed.ok) setOpen(false);
            }
          } catch (error) {
            if (isRedirectError(error)) throw error;
            fail(failureMessage);
          } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
            setIsLoading(false);
          }
        }}
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <CardHeader
          headingLevel={2}
          title="Workout in progress"
          meta={<CardMeta items={[dayName?.trim() ?? "", formatTodayInSessionMeta(loggedSetCount)]} />}
          trailing={(
            <Menu
              label="Workout actions"
              minWidth={176}
              items={[{
                id: "discard-workout",
                label: "Discard workout",
                tone: "danger",
                disabled: isLoading || isSubmitting,
                onSelect: () => setOpen(true),
              }]}
            />
          )}
        />
        <ConfirmDestructiveModal
          open={open}
          title="Discard workout?"
          titleVariant="raw"
          consequenceText="Current workout will be removed."
          confirmLabel={CONFIRM_ACTION_LABELS.discardWorkout}
          isLoading={isLoading || isSubmitting}
          confirmVariant="destructive"
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            if (submittingRef.current || !formRef.current) return;
            submittingRef.current = true;
            setIsSubmitting(true);
            formRef.current.requestSubmit();
          }}
        />
      </form>
    </CardSurface>
  );
}
