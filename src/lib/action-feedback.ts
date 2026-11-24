"use client";

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

  toast.error(result.error || messages.error);
}
