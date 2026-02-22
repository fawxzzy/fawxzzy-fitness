"use client";

type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export function toastActionResult(
  toast: ToastApi,
  result: ActionResult,
  messages: { success: string; error: string },
) {
  if (result.ok) {
    toast.success(result.message ?? messages.success);
    return;
  }

  toast.error(result.error ?? messages.error);
}
