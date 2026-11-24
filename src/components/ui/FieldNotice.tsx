"use client";

import { useCallback, useEffect, useRef } from "react";
import { useOptionalToast } from "@/components/ui/ToastProvider";

// Form errors go to the in-flow notice, never as red text under a field (docs/ui/FOUNDATION.md "FieldNotice",
// Zac 2026-11-23: "no inline red errors"). The notice is the app's ToastProvider error card, which a
// MobileScreenShell renders IN FLOW under the header (content moves down, nothing is covered). The field itself
// keeps only a neutral marker and its aria-invalid / sr-only description (FormField does that part).
//
// - `useFieldNotice(id)`: imperative `report(message)` / `clear()` for submit handlers and server-action results.
// - `useFieldErrorNotice(error, { id })`: declarative; shows the notice whenever `error` becomes a new non-empty
//   string and dismisses it when `error` clears or the field unmounts. Keep it mounted while the field is: render
//   it with `error={null}` rather than conditionally, or the clear never reaches the notice.
// - `<FieldNotice error id />`: the same as a component, for server-compatible parents such as FormField.
// Outside a ToastProvider (isolated renders, tests) all three are silent no-ops.

export type FieldNoticeOptions = {
  /** Stable notice id: a newer error for the same field replaces the old notice instead of stacking. */
  id: string;
  /** Keep the notice until dismissed (for errors that block the next step). Default: the 6 s error duration. */
  persistent?: boolean;
};

export function fieldNoticeId(fieldId: string) {
  return `field-notice:${fieldId}`;
}

export function useFieldNotice(id: string, options?: { persistent?: boolean }) {
  const toast = useOptionalToast();
  const persistent = options?.persistent;

  const report = useCallback(
    (message: string | null | undefined) => {
      const normalized = message?.trim();
      if (!toast) return;
      if (!normalized) {
        toast.dismiss(id);
        return;
      }
      toast.error(normalized, { id, persistent });
    },
    [id, persistent, toast],
  );

  const clear = useCallback(() => {
    toast?.dismiss(id);
  }, [id, toast]);

  return { report, clear };
}

export function useFieldErrorNotice(error: string | null | undefined, options: FieldNoticeOptions) {
  const toast = useOptionalToast();
  const lastShownRef = useRef<string | null>(null);
  const { id, persistent } = options;

  useEffect(() => {
    if (!toast) return;
    const normalized = error?.trim() || null;
    if (normalized === lastShownRef.current) return;
    const previous = lastShownRef.current;
    lastShownRef.current = normalized;
    if (!normalized) {
      if (previous) toast.dismiss(id);
      return;
    }
    toast.error(normalized, { id, persistent });
  }, [error, id, persistent, toast]);

  // A field that goes away (sheet closed, step changed) takes its notice with it.
  useEffect(() => () => {
    if (lastShownRef.current) {
      lastShownRef.current = null;
      toast?.dismiss(id);
    }
  }, [id, toast]);
}

export function FieldNotice({ error, id, persistent }: { error: string | null | undefined } & FieldNoticeOptions) {
  useFieldErrorNotice(error, { id, persistent });
  return null;
}
