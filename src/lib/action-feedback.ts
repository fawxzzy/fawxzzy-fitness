"use client";

import { friendlyActionError } from "@/lib/action-error-copy";
import type { ActionResult } from "@/lib/action-result";

type ActionFeedbackResult = ActionResult | { ok: boolean; error?: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export function toastActionResult(
  toast: ToastApi,
  result: ActionFeedbackResult,
  messages: { success: string; error: string },
) {
  if (result.ok) {
    toast.success(messages.success);
    return;
  }

  // Never show a raw code ("session_expired") or database text: map it to copy, else use the caller's message.
  toast.error(friendlyActionError(result.error, messages.error));
}
