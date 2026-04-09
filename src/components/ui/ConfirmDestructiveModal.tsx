"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AppButton } from "@/components/ui/AppButton";

export function ConfirmDestructiveModal({
  open,
  title,
  consequenceText,
  description,
  confirmLabel,
  contextLines,
  details,
  bullets,
  isLoading = false,
  confirmVariant = "destructive",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  consequenceText?: string;
  description?: string;
  confirmLabel: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  isLoading?: boolean;
  confirmVariant?: "primary" | "destructive";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const resolvedConsequenceText = consequenceText ?? description ?? "";
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const detailLines = [resolvedConsequenceText, ...(contextLines ?? []), details ?? ""]
    .map((line) => line.trim())
    .filter(Boolean);

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pb-[max(1rem,var(--app-safe-bottom))] pt-[max(1rem,var(--app-safe-top))]">
      <button
        type="button"
        aria-label="Close confirmation"
        className="fixed inset-0 z-0 bg-black/42 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-[22rem] space-y-3 rounded-[1.1rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--shell-rgb)/0.94)] p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="space-y-1">
          <h2 id={titleId} className="text-base font-semibold text-text">{title}</h2>
          {detailLines.length ? (
            <div className="space-y-0.5 text-sm text-[rgb(var(--text-secondary)/0.94)]">
              {detailLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
        {bullets?.length ? (
          <div className="rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface)/0.42)] px-3 py-2">
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-[rgb(var(--text-muted)/0.95)]">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <AppButton type="button" variant="secondary" size="md" onClick={onCancel} disabled={isLoading} className="min-h-10 rounded-[0.92rem]">
            Cancel
          </AppButton>
          <AppButton type="button" variant={confirmVariant} size="md" onClick={onConfirm} disabled={isLoading} className="min-h-10 rounded-[0.92rem]">
            {isLoading ? `${confirmLabel}...` : confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
