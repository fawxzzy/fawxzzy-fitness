"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OverlayHeaderBlock, overlayChromeClassNames } from "@/components/ui/OverlayChrome";
import { cn } from "@/lib/cn";

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
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [isRendered, setIsRendered] = useState(open);
  const shouldRender = open || isRendered;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      setIsRendered(true);
    }
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;

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
  }, [onClose, shouldRender]);

  useEffect(() => {
    if (!open) {
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusTarget = sheetRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    (focusTarget ?? sheetRef.current)?.focus();
  }, [open]);

  if (!shouldRender) return null;

  return createPortal(
    <AnimatePresence initial={false} onExitComplete={() => setIsRendered(false)}>
      {open ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center" role="presentation">
          <motion.button
            type="button"
            className={overlayChromeClassNames.scrim}
            aria-label={`Close ${title}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              overlayChromeClassNames.panelBase,
              "flex max-h-[min(100dvh,48rem)] w-full max-w-[min(640px,100vw-0.75rem)] min-w-0 flex-col rounded-t-[calc(var(--radius-xl)+2px)] shadow-[0_-18px_44px_rgba(0,0,0,0.34)]",
              className,
            )}
            initial={reduceMotion ? { opacity: 0.98 } : { opacity: 0.98, y: 28 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0.98 } : { opacity: 0.98, y: 18 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "opacity, transform" }}
          >
            <div className={overlayChromeClassNames.handle} aria-hidden="true" />
            <OverlayHeaderBlock eyebrow="Sheet" title={title} titleId={titleId} description={description} />
            <div className={cn(overlayChromeClassNames.body, contentClassName)}>{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
