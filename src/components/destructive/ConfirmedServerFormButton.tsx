"use client";

import { useRef, useState } from "react";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { cn } from "@/lib/cn";

export function ConfirmedServerFormButton({
  action,
  onSuccess,
  hiddenFields,
  triggerLabel,
  triggerAriaLabel,
  triggerIntent,
  triggerClassName,
  modalTitle,
  modalConsequenceText,
  modalDescription,
  confirmLabel,
  contextLines,
  details,
  bullets,
  size = "sm",
  disabled = false,
  confirmVariant = "destructive",
}: {
  action: (formData: FormData) => unknown | Promise<unknown>;
  onSuccess?: () => void | Promise<void>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerIntent?: BottomActionIntent;
  triggerClassName?: string;
  modalTitle: string;
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
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setIsLoading(true);
        try {
          const result = await action(formData);
          if (
            typeof result === "object"
            && result !== null
            && "ok" in result
            && Boolean((result as { ok?: boolean }).ok)
          ) {
            setOpen(false);
            await onSuccess?.();
          }
        } finally {
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
        disabled={isLoading || disabled}
        onClick={() => setOpen(true)}
      >
        <span className={triggerIntent ? "bottom-action__label" : undefined}>{triggerLabel}</span>
      </button>
      <ConfirmDestructiveModal
        open={open}
        title={modalTitle}
        consequenceText={modalConsequenceText ?? modalDescription ?? ""}
        confirmLabel={confirmLabel}
        contextLines={contextLines}
        details={details}
        bullets={bullets}
        isLoading={isLoading}
        confirmVariant={confirmVariant}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
