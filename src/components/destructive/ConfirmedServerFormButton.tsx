"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { friendlyActionError } from "@/lib/action-error-copy";
import { cn } from "@/lib/cn";
import { isRedirectError } from "@/lib/next-navigation-errors";

function readActionFailure(result: unknown): string | null {
  if (typeof result !== "object" || result === null || !("ok" in result) || (result as { ok?: unknown }).ok !== false) {
    return null;
  }
  const error = (result as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error.trim() : "";
}

export function ConfirmedServerFormButton({
  action,
  onBeforeSubmit,
  onSuccess,
  hiddenFields,
  triggerLabel,
  triggerAriaLabel,
  triggerIntent,
  triggerClassName,
  modalTitle,
  modalTitleVariant,
  showDetailsInDeleteLayout,
  modalConsequenceText,
  modalDescription,
  confirmLabel,
  contextLines,
  details,
  bullets,
  size = "sm",
  disabled = false,
  confirmVariant = "destructive",
  failureMessage,
}: {
  action: (formData: FormData) => unknown | Promise<unknown>;
  onBeforeSubmit?: () => void;
  onSuccess?: () => void | Promise<void>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerIntent?: BottomActionIntent;
  triggerClassName?: string;
  modalTitle: string;
  /** "raw" shows modalTitle as written ("Delete Day 5?") instead of the generic "Confirm delete". */
  modalTitleVariant?: "confirm" | "raw";
  showDetailsInDeleteLayout?: boolean;
  modalConsequenceText?: string;
  /** @deprecated Use modalConsequenceText for destructive confirmation copy. */
  modalDescription?: string;
  confirmLabel: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  size?: "sm" | "md";
  disabled?: boolean;
  confirmVariant?: "primary" | "destructive";
  /**
   * Opt-in failure handling: when set, an `{ ok: false }` result or a thrown action (offline, 500, server crash)
   * closes the dialog and shows an error notice (the result's own error text first, else this message) instead of
   * leaving the dialog open with no feedback or handing the throw to the app error screen, then refreshes the route so
   * the screen matches the server again. redirect() still navigates.
   */
  failureMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // State set inside a form action only commits when the async action ends, so isLoading alone cannot stop a double
  // tap: guard synchronously in the click handler and disable the buttons from there (History review 2026-11-24).
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setIsLoading(true);
        try {
          const result = await action(formData);
          const failure = failureMessage === undefined ? null : readActionFailure(result);
          if (failure !== null) {
            setOpen(false);
            toast.error(friendlyActionError(failure, failureMessage ?? "", { refreshes: true }));
            // Re-read the screen: the thing may already be gone (or half gone), and a stale button can only fail again.
            router.refresh();
            return;
          }
          if (
            typeof result === "object"
            && result !== null
            && "ok" in result
            && Boolean((result as { ok?: boolean }).ok)
          ) {
            setOpen(false);
            await onSuccess?.();
          }
        } catch (error) {
          if (failureMessage === undefined || isRedirectError(error)) {
            throw error;
          }
          setOpen(false);
          toast.error(failureMessage);
          router.refresh();
        } finally {
          submittingRef.current = false;
          setIsSubmitting(false);
          setIsLoading(false);
        }
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="button"
        aria-label={triggerAriaLabel}
        data-bottom-action-intent={triggerIntent}
        className={cn(
          triggerIntent
            ? getBottomActionButtonClassName({
              intent: triggerIntent,
              size,
              className: triggerClassName,
            })
            : triggerClassName,
          open ? "pointer-events-none opacity-0" : "",
        )}
        disabled={isLoading || isSubmitting || disabled}
        onClick={() => setOpen(true)}
      >
        <span className={triggerIntent ? "bottom-action__label" : undefined}>{triggerLabel}</span>
      </button>
      <ConfirmDestructiveModal
        open={open}
        title={modalTitle}
        titleVariant={modalTitleVariant}
        showDetailsInDeleteLayout={showDetailsInDeleteLayout}
        consequenceText={modalConsequenceText ?? modalDescription ?? ""}
        confirmLabel={confirmLabel}
        contextLines={contextLines}
        details={details}
        bullets={bullets}
        isLoading={isLoading || isSubmitting}
        confirmVariant={confirmVariant}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (submittingRef.current || !formRef.current) return;
          submittingRef.current = true;
          setIsSubmitting(true);
          onBeforeSubmit?.();
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
