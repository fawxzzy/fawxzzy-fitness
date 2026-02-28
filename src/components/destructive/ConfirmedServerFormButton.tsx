"use client";

import { useRef, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";

export function ConfirmedServerFormButton({
  action,
  hiddenFields,
  triggerLabel,
  triggerAriaLabel,
  triggerClassName,
  modalTitle,
  modalDescription,
  confirmLabel,
  contextLines,
  details,
  bullets,
  size = "sm",
  disabled = false,
}: {
  action: (formData: FormData) => unknown | Promise<unknown>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  modalTitle: string;
  modalDescription: string;
  confirmLabel: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  size?: "sm" | "md";
  disabled?: boolean;
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
          await action(formData);
        } finally {
          setIsLoading(false);
        }
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <AppButton
        type="button"
        variant="destructive"
        size={size}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        disabled={isLoading || disabled}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </AppButton>
      <ConfirmDestructiveModal
        open={open}
        title={modalTitle}
        description={modalDescription}
        confirmLabel={confirmLabel}
        contextLines={contextLines}
        details={details}
        bullets={bullets}
        isLoading={isLoading}
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
