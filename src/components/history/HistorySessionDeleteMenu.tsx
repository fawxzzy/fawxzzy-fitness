"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/ToastProvider";
import { friendlyActionError } from "@/lib/action-error-copy";
import { isRedirectError } from "@/lib/next-navigation-errors";

/**
 * Session detail kebab (DESIGN #7): Delete leaves the bottom dock (where a red Delete sat beside Edit) for the shared
 * Menu in the header, and the confirm uses the real verb ("Delete session"). Same submit rules as
 * ConfirmedServerFormButton: the action runs as a form action (so its redirect to /history navigates), a double tap
 * on the confirm submits once, and a failure closes the dialog, shows the in-flow notice and refreshes the screen.
 */
export function HistorySessionDeleteMenu({
  sessionId,
  action,
  onBeforeSubmit,
  sessionName,
  title,
  consequence,
  failureMessage,
  disabled = false,
}: {
  sessionId: string;
  action: (formData: FormData) => unknown | Promise<unknown>;
  onBeforeSubmit?: () => void;
  /** The session as named in the confirm ("Day 5"); also used in the menu label. */
  sessionName: string;
  title: string;
  consequence: string;
  failureMessage: string;
  disabled?: boolean;
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
    <form
      ref={formRef}
      data-history-session-actions="true"
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
      <Menu
        label={`Actions for ${sessionName}`}
        minWidth={176}
        items={[{
          id: "delete-session",
          label: "Delete session",
          tone: "danger",
          disabled: disabled || isLoading || isSubmitting,
          onSelect: () => setOpen(true),
        }]}
      />
      <ConfirmDestructiveModal
        open={open}
        title={title}
        consequenceText={consequence}
        confirmLabel="Delete session"
        isLoading={isLoading || isSubmitting}
        confirmVariant="destructive"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (submittingRef.current || !formRef.current) return;
          submittingRef.current = true;
          setIsSubmitting(true);
          onBeforeSubmit?.();
          formRef.current.requestSubmit();
        }}
      />
    </form>
  );
}
