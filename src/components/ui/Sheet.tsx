"use client";

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { overlayChromeClassNames } from "@/components/ui/OverlayChrome";
import { useSheetNoticeSlotRef } from "@/components/ui/ToastProvider";
import { EyebrowText, SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

// The ONE bottom sheet (docs/ui/FOUNDATION.md). Every bottom sheet, picker and confirm in the app renders through
// this: portaled to <body>, z 120 (= --z-sheet, DESIGN-CONTRACT.md section 15 layers), a token scrim that dims and
// blurs the screen, a drag handle, a title row with a visible 44px close button, a scrolling body, an optional
// pinned footer that clears the home indicator, focus entry/containment/return, Escape, and a body scroll lock.
// Sheets stack: only the top-most open sheet answers Escape and Tab, and the scroll lock is released by the last one.

export type SheetTitleTone = "plain" | "accent";

export type SheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  /** Small muted line above the title. */
  eyebrow?: ReactNode;
  /** Muted supporting copy under the title. */
  description?: ReactNode;
  /** Pinned under the scrolling body (the sheet's actions). Pads for the home indicator. */
  footer?: ReactNode;
  /** "accent" uses the green header title colour (screen headers); "plain" for confirms and pickers. */
  titleTone?: SheetTitleTone;
  /** The visible 44px close (X) button in the title row. Confirms with their own Cancel turn it off. */
  showCloseButton?: boolean;
  /** CSS selector for the element that gets focus on open (else the first focusable element, else the panel). */
  initialFocusSelector?: string;
  className?: string;
  contentClassName?: string;
  /** Extra attributes for the dialog element (e.g. data-* hooks for tests and QA). */
  dialogProps?: Record<`data-${string}`, string | undefined>;
};

export const SHEET_Z_INDEX_CLASS_NAME = "z-[120]";
// Token-only scrim: the app background at 62% plus a 6px blur, so the sheet reads as the only live surface.
// The scrim is a <button>: the global button surface would paint it opaque and hide the screen behind the sheet, so
// every surface utility is `!` (cn() does not dedupe Tailwind classes; same fix as PR #299 on BottomSheet).
export const SHEET_SCRIM_CLASSNAME = "fixed inset-0 z-0 !border-0 !bg-[rgb(var(--bg-app)/0.62)] !shadow-none backdrop-blur-[6px]";
export const SHEET_PANEL_CLASSNAME =
  "flex max-h-[min(calc(100dvh-var(--app-safe-top)-0.5rem),48rem)] w-full max-w-[min(640px,100vw-0.75rem)] min-w-0 flex-col rounded-t-[calc(var(--radius-xl)+2px)] shadow-[0_-18px_44px_rgba(0,0,0,0.34)]";
const SHEET_TITLE_CLASSNAME = "min-w-0 flex-1 text-[1.25rem] font-semibold leading-7 tracking-[-0.02em]";
// Colours use `[button&]:` so they beat the unlayered global `button, [type="button"]` rule (FOUNDATION.md cascade trap).
const SHEET_CLOSE_BUTTON_CLASSNAME =
  "-mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors [button&]:border-0 [button&]:bg-transparent [button&]:text-[rgb(var(--text-secondary))] [button&]:hover:bg-[rgb(var(--surface-2)/0.7)] [button&]:hover:text-[rgb(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] [-webkit-tap-highlight-color:transparent]";
const SHEET_FOOTER_CLASSNAME =
  "shrink-0 border-t border-[rgb(var(--border-strong)/0.12)] px-4 pt-3 pb-[max(0.75rem,var(--app-safe-bottom))]";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableSheetElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
  );
}

// Open sheets, oldest first. Only the last entry handles keys; the body scroll lock follows the stack length.
const openSheetStack: symbol[] = [];
let lockedBodyOverflow: string | null = null;

function pushSheet(token: symbol) {
  if (openSheetStack.length === 0) {
    lockedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  openSheetStack.push(token);
}

function popSheet(token: symbol) {
  const index = openSheetStack.lastIndexOf(token);
  if (index >= 0) openSheetStack.splice(index, 1);
  if (openSheetStack.length === 0 && lockedBodyOverflow !== null) {
    document.body.style.overflow = lockedBodyOverflow;
    lockedBodyOverflow = null;
  }
}

function isTopSheet(token: symbol) {
  return openSheetStack[openSheetStack.length - 1] === token;
}

// While AnimatePresence plays the exit, the closing sheet is still in the DOM. It must stop being a dialog at once:
// no role, aria-hidden and inert, so screen readers, focus and `queryByRole("dialog")` see it gone immediately.
function SheetPresence({ children }: { children: (isPresent: boolean) => ReactNode }) {
  const isPresent = useIsPresent();
  return <>{children(isPresent)}</>;
}

export function SheetCloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  eyebrow,
  description,
  footer,
  titleTone = "plain",
  showCloseButton = true,
  initialFocusSelector,
  className,
  contentClassName,
  dialogProps,
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const tokenRef = useRef<symbol>(Symbol("sheet"));
  const onCloseRef = useRef(onClose);
  const [isRendered, setIsRendered] = useState(open);
  const shouldRender = open || isRendered;
  const reduceMotion = useReducedMotion();
  const noticeSlotRef = useSheetNoticeSlotRef();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const token = tokenRef.current;
    pushSheet(token);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopSheet(token)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableSheetElements(sheetRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        sheetRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const activeElementIsInsideSheet = activeElement instanceof HTMLElement && sheetRef.current?.contains(activeElement);

      if (event.shiftKey && (!activeElementIsInsideSheet || activeElement === firstElement)) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (!activeElementIsInsideSheet || activeElement === lastElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      popSheet(token);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      previousActiveElementRef.current?.focus?.();
      previousActiveElementRef.current = null;
      return;
    }

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const preferred = initialFocusSelector
      ? sheetRef.current?.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const focusTarget = preferred ?? getFocusableSheetElements(sheetRef.current)[0];
    (focusTarget ?? sheetRef.current)?.focus();
    // Focus entry runs once per open; the selector is static per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!shouldRender || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence initial={false} onExitComplete={() => setIsRendered(false)}>
      {open ? (
        <SheetPresence key="sheet">{(isPresent) => (
        <div
          className={cn("fixed inset-0 flex items-end justify-center", SHEET_Z_INDEX_CLASS_NAME, isPresent ? undefined : "pointer-events-none")}
          role="presentation"
          aria-hidden={isPresent ? undefined : true}
          inert={isPresent ? undefined : true}
          data-sheet-root=""
          data-sheet-state={isPresent ? "open" : "closing"}
        >
          <motion.button
            type="button"
            tabIndex={-1}
            className={SHEET_SCRIM_CLASSNAME}
            aria-label={`Close ${title}`}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.16, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            {...dialogProps}
            ref={sheetRef}
            role={isPresent ? "dialog" : undefined}
            aria-modal={isPresent ? "true" : undefined}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            data-sheet=""
            className={cn(overlayChromeClassNames.panelBase, "relative z-10 outline-none", SHEET_PANEL_CLASSNAME, className)}
            initial={reduceMotion ? { opacity: 0.98 } : { opacity: 0.98, y: 28 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0.98 } : { opacity: 0.98, y: 18 }}
            transition={{ duration: reduceMotion ? 0.08 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "opacity, transform" }}
          >
            <div className={cn(overlayChromeClassNames.handle, "mb-1")} aria-hidden="true" />
            <div className="flex min-w-0 items-start gap-2 px-4 pb-2">
              <div className="min-w-0 flex-1 space-y-1 pt-1.5">
                {eyebrow ? <EyebrowText className={overlayChromeClassNames.eyebrow}>{eyebrow}</EyebrowText> : null}
                <h2
                  id={titleId}
                  className={cn(
                    SHEET_TITLE_CLASSNAME,
                    titleTone === "accent" ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-primary))]",
                  )}
                >
                  {title}
                </h2>
                {description ? (
                  <SubtitleText as="div" id={descriptionId} className={overlayChromeClassNames.description}>
                    {description}
                  </SubtitleText>
                ) : null}
              </div>
              {showCloseButton ? (
                <button type="button" aria-label="Close" className={SHEET_CLOSE_BUTTON_CLASSNAME} onClick={onClose} data-sheet-close="">
                  <SheetCloseIcon />
                </button>
              ) : null}
            </div>
            {/* Notices raised while this sheet is open land here (ToastProvider), in flow under the title, never under
                the sheet layer. Registered only while open; empty = 0px. */}
            <div ref={isPresent ? noticeSlotRef : undefined} data-sheet-notice-slot="" className="shrink-0" />
            {children !== undefined && children !== null && children !== false ? (
              <div className={cn(overlayChromeClassNames.body, footer ? "pb-3" : undefined, contentClassName)}>{children}</div>
            ) : null}
            {footer ? <div className={SHEET_FOOTER_CLASSNAME} data-sheet-footer="">{footer}</div> : null}
          </motion.div>
        </div>
        )}</SheetPresence>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
