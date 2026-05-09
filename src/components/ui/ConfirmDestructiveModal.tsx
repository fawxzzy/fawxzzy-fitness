"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionSplit, BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME } from "@/components/layout/CanonicalBottomActions";

const MODAL_BACKDROP_CLASSNAME =
  "bg-[rgba(7,17,27,0.015)]";
const MODAL_BOTTOM_BAR_SURFACE_CLASSNAME =
  "bg-[linear-gradient(180deg,rgba(var(--bg-app),0.28)_0%,rgba(var(--bg-app),0.86)_18%,rgba(var(--bg-app),0.97)_100%)] backdrop-blur-[14px]";

function resolveConfirmTitle(title: string, confirmLabel: string) {
  const trimmedLabel = confirmLabel.trim();
  const normalizedLabel = trimmedLabel.toLowerCase();

  if (!trimmedLabel || normalizedLabel === "confirm") return title;
  return `Confirm ${normalizedLabel}`;
}

function resolveConfirmActionLabel(confirmLabel: string) {
  void confirmLabel;
  return "Confirm";
}

export function ConfirmDestructiveModal({
  open,
  title,
  consequenceText,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmActionLabel: confirmActionLabelOverride,
  contextLines,
  details,
  bullets,
  children,
  isLoading = false,
  confirmDisabled = false,
  confirmVariant = "destructive",
  titleVariant = "confirm",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  consequenceText?: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmActionLabel?: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  children?: ReactNode;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: "primary" | "destructive";
  titleVariant?: "confirm" | "raw";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const resolvedTitle = titleVariant === "raw" ? title : resolveConfirmTitle(title, confirmLabel);
  const confirmActionLabel = confirmActionLabelOverride ?? resolveConfirmActionLabel(confirmLabel);
  const supportingLines = [
    consequenceText,
    description,
    details,
    ...(contextLines ?? []),
    ...(bullets ?? []),
  ].filter((line): line is string => typeof line === "string" && line.trim().length > 0);
  const portalTarget = typeof document === "undefined"
    ? null
    : document.querySelector(".app-shell") ?? document.body;

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
    if (!open || !(portalTarget instanceof HTMLElement)) return;

    const shellContent = Array.from(portalTarget.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("z-10"),
    );
    if (!shellContent) return;

    const previousFilter = shellContent.style.filter;
    const previousTransition = shellContent.style.transition;
    const previousTransform = shellContent.style.transform;
    const previousWillChange = shellContent.style.willChange;

    shellContent.style.filter = "blur(1.5px) brightness(0.96) saturate(0.98)";
    shellContent.style.transform = "scale(0.992) translateZ(0)";
    shellContent.style.willChange = "filter";
    shellContent.style.transition = previousTransition
      ? `${previousTransition}, filter 180ms cubic-bezier(0.22, 1, 0.36, 1)`
      : "filter 180ms cubic-bezier(0.22, 1, 0.36, 1)";

    return () => {
      shellContent.style.filter = previousFilter;
      shellContent.style.transition = previousTransition;
      shellContent.style.transform = previousTransform;
      shellContent.style.willChange = previousWillChange;
    };
  }, [open, portalTarget]);

  useEffect(() => {
    if (!open) return;

    const focusable = modalRootRef.current?.querySelector<HTMLElement>(
      "[data-confirm-modal-action='cancel']:not([disabled]), [data-confirm-modal-action='confirm']:not([disabled])",
    );
    focusable?.focus();
  }, [open]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div
      ref={modalRootRef}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 pb-[calc(var(--app-safe-bottom)+5.5rem)] pt-[max(1rem,var(--app-safe-top))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div aria-hidden="true" className={`fixed inset-0 z-0 ${MODAL_BACKDROP_CLASSNAME}`} />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1]"
        onClick={onCancel}
      />
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-[22rem] rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.96)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-[14px]"
      >
        <h2 id={titleId} className="text-center text-[1.3125rem] font-semibold leading-tight tracking-[-0.03em] text-text">{resolvedTitle}</h2>
        {supportingLines.length > 0 ? (
          <div className="mt-3 space-y-1.5 text-center text-[0.82rem] font-medium leading-snug text-[rgb(var(--text-muted)/0.84)]">
            {supportingLines.map((line, index) => (
              <p key={`${index}-${line}`}>{line}</p>
            ))}
          </div>
        ) : null}
        {children ? (
          <div className="mt-3">
            {children}
          </div>
        ) : null}
      </div>
      <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 ${MODAL_BOTTOM_BAR_SURFACE_CLASSNAME}`}>
        <div className="pointer-events-auto mx-auto w-full max-w-[720px] px-4">
          <div className={BOTTOM_ACTION_SURFACE_OUTER_CLASSNAME}>
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="toggleInactive"
                  onClick={onCancel}
                  disabled={isLoading}
                  data-confirm-modal-action="cancel"
                >
                  {cancelLabel}
                </BottomDockButton>
              )}
              primary={(
                <BottomDockButton
                  type="button"
                  variant={confirmVariant}
                  onClick={onConfirm}
                  disabled={isLoading || confirmDisabled}
                  loading={isLoading}
                  loadingLabel={isLoading ? `${confirmActionLabel}...` : undefined}
                  data-confirm-modal-action="confirm"
                >
                  {confirmActionLabel}
                </BottomDockButton>
              )}
            />
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
