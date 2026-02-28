"use client";

import { AppButton } from "@/components/ui/AppButton";

export function ConfirmDestructiveModal({
  open,
  title,
  description,
  confirmLabel,
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
  details?: string;
  bullets?: string[];
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-destructive-title">
      <div className="w-full max-w-sm space-y-3 rounded-xl border border-border/70 bg-surface p-4 shadow-lg">
        <h2 id="confirm-destructive-title" className="text-base font-semibold text-text">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
        {details ? <p className="text-xs text-muted">{details}</p> : null}
        {bullets?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>Cancel</AppButton>
          <AppButton type="button" variant="destructive" size="sm" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? `${confirmLabel}...` : confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
