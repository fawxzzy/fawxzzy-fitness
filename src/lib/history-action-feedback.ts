"use client";

import { toastActionResult } from "@/lib/action-feedback";
import { friendlyActionError } from "@/lib/action-error-copy";

type HistoryActionResult = { ok: boolean; error?: string };

type ToastApi = Parameters<typeof toastActionResult>[0];

/**
 * History-only wrapper around toastActionResult: maps raw codes/database text to plain copy before the notice shows.
 * Pass `refreshes: true` only when the caller runs router.refresh() after this failure.
 */
export function toastHistoryActionResult(
  toast: ToastApi,
  result: HistoryActionResult,
  messages: { success: string; error: string },
  options: { refreshes?: boolean } = {},
) {
  if (result.ok) {
    toastActionResult(toast, result, messages);
    return;
  }
  toastActionResult(toast, { ok: false, error: friendlyActionError(result.error, messages.error, options) }, messages);
}
