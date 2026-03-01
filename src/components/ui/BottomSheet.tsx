"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function BottomSheet({ open, title, onClose, children, className }: BottomSheetProps) {
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
        aria-label="Close routine switcher"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full max-w-[640px] rounded-t-2xl border border-border/45 bg-[rgb(var(--surface-rgb)/0.97)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl ${className ?? ""}`}
      >
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        <h2 id={titleId} className="px-1 pb-3 text-sm font-medium text-muted">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
