"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  contentClassName?: string;
};

export function BottomSheet({ open, title, onClose, children, className, description, contentClassName }: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[min(100dvh,48rem)] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[1.9rem] border border-border/45 bg-[rgb(var(--surface-rgb)/0.985)] shadow-[0_-14px_40px_rgba(0,0,0,0.34)] ${className ?? ""}`}
      >
        <div className="mx-auto mb-3 mt-2 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        <div className="px-4 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Workout entry</p>
          <h2 id={titleId} className="mt-1 text-base font-semibold text-text">
            {title}
          </h2>
          {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
        </div>
        <div className={`min-h-0 overflow-y-auto px-4 pb-[max(1rem,var(--app-safe-bottom))] pt-2 ${contentClassName ?? ""}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
