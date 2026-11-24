"use client";

import type { ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Sheet } from "@/components/ui/Sheet";

// The confirm dialog (docs/ui/FOUNDATION.md "Confirm"). It renders on the shared Sheet: token scrim that dims and
// blurs the screen, title, the object being acted on (`objectName`), the consequence, then [Cancel | Confirm] in the
// pinned footer. Focus starts on Cancel (else Confirm); Escape and a tap on the scrim cancel.
// The name is historic: it confirms non-destructive actions too (`confirmVariant="primary"`).

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

const INITIAL_FOCUS_SELECTOR =
  "[data-confirm-modal-action='cancel']:not([disabled]), [data-confirm-modal-action='confirm']:not([disabled])";

export type ConfirmDestructiveModalProps = {
  open: boolean;
  title: string;
  /** The thing being acted on ("Push Day", "Bench Press"). Shown prominently so the person knows what they confirm. */
  objectName?: string;
  consequenceText?: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmActionLabel?: string;
  contextLines?: string[];
  details?: string;
  bullets?: string[];
  children?: ReactNode;
  /** Replaces the default [Cancel | Confirm] footer (used with hideBottomActions). */
  attachedFooter?: ReactNode;
  isLoading?: boolean;
  confirmDisabled?: boolean;
  confirmVariant?: "primary" | "destructive";
  titleVariant?: "confirm" | "raw";
  hideBottomActions?: boolean;
  hideCancelAction?: boolean;
  /**
   * Kept for callers from the History redesign (#300). The old delete layout hid supporting lines unless this was set;
   * the Sheet confirm always shows the object name and the consequence, so it is accepted and has no effect.
   */
  showDetailsInDeleteLayout?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const noopClose = () => {};

export function ConfirmDestructiveModal({
  open,
  title,
  objectName,
  consequenceText,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmActionLabel: confirmActionLabelOverride,
  contextLines,
  details,
  bullets,
  children,
  attachedFooter,
  isLoading = false,
  confirmDisabled = false,
  confirmVariant = "destructive",
  titleVariant = "confirm",
  hideBottomActions = false,
  hideCancelAction = false,
  showDetailsInDeleteLayout: _showDetailsInDeleteLayout = false,
  onCancel,
  onConfirm,
}: ConfirmDestructiveModalProps) {
  void _showDetailsInDeleteLayout;
  const resolvedTitle = titleVariant === "raw" ? title : resolveConfirmTitle(title, confirmLabel);
  const confirmActionLabel = confirmActionLabelOverride ?? resolveConfirmActionLabel(confirmLabel);
  const trimmedObjectName = objectName?.trim() ?? "";
  const supportingLines = [
    consequenceText,
    description,
    details,
    ...(contextLines ?? []),
    ...(bullets ?? []),
  ].filter((line): line is string => typeof line === "string" && line.trim().length > 0);

  const confirmButton = (
    <AppButton
      type="button"
      variant={confirmVariant === "destructive" ? "danger" : "primary"}
      size="md"
      fullWidth
      onClick={onConfirm}
      disabled={confirmDisabled}
      loading={isLoading}
      data-confirm-modal-action="confirm"
    >
      {confirmActionLabel}
    </AppButton>
  );

  const footer = attachedFooter
    ? attachedFooter
    : hideBottomActions
      ? null
      : hideCancelAction
        ? confirmButton
        : (
          <div className="grid grid-cols-2 gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={onCancel}
              disabled={isLoading}
              data-confirm-modal-action="cancel"
            >
              {cancelLabel}
            </AppButton>
            {confirmButton}
          </div>
        );

  const hasBody = trimmedObjectName.length > 0 || supportingLines.length > 0 || Boolean(children);

  return (
    <Sheet
      open={open}
      title={resolvedTitle}
      // While the confirm is in flight, Escape and a scrim tap do nothing (Cancel is disabled too), so the dialog cannot
      // vanish under a running delete.
      onClose={isLoading ? noopClose : onCancel}
      footer={footer}
      showCloseButton={!footer || hideCancelAction}
      initialFocusSelector={INITIAL_FOCUS_SELECTOR}
      dialogProps={{ "data-confirm-modal": confirmVariant }}
    >
      {hasBody ? (
        <div className="space-y-2 pb-1">
          {trimmedObjectName ? (
            <p
              data-confirm-object-name=""
              className="break-words rounded-[var(--radius-sm)] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.72)] px-3 py-2.5 text-base font-semibold leading-snug text-[rgb(var(--text-primary))]"
            >
              {trimmedObjectName}
            </p>
          ) : null}
          {supportingLines.length > 0 ? (
            <div className="space-y-1.5 text-[0.9375rem] font-medium leading-relaxed text-[rgb(var(--text-secondary)/0.92)]">
              {supportingLines.map((line, index) => (
                <p key={`${index}-${line}`}>{line}</p>
              ))}
            </div>
          ) : null}
          {children ? <div className="pt-1">{children}</div> : null}
        </div>
      ) : null}
    </Sheet>
  );
}
