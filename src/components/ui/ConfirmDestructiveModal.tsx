"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AppButton } from "@/components/ui/AppButton";

export function ConfirmDestructiveModal({
  open,
  title,
  description,
  confirmLabel,
  contextLines,
  details,
  bullets,
  isLoading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;

    const focusable = modalRef.current?.querySelector<HTMLElement>("button:not([disabled])");
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        aria-label="Close confirmation"
        className="fixed inset-0 z-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      />
      <div
        ref={modalRef}
        className="relative z-10 w-[calc(100%-2rem)] max-w-[420px] space-y-4 rounded-2xl bg-[rgb(var(--surface-rgb)/0.97)] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
        {(contextLines?.length || details) ? (
          <div className="space-y-1 rounded-xl bg-black/15 px-3 py-2 text-xs text-muted">
            {contextLines?.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {details ? <p>{details}</p> : null}
          </div>
        ) : null}
        {bullets?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <AppButton type="button" variant="secondary" size="md" onClick={onCancel} disabled={isLoading} className="min-h-11">
            Cancel
          </AppButton>
          <AppButton type="button" variant="destructive" size="md" onClick={onConfirm} disabled={isLoading} className="min-h-11">
            {isLoading ? `${confirmLabel}...` : confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
