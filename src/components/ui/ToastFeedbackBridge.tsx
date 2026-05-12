"use client";

import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";

export function ToastFeedbackBridge({
  error,
  info,
  warning,
  success,
}: {
  error?: string | null;
  info?: string | null;
  warning?: string | null;
  success?: string | null;
}) {
  useToastMessageEffect("error", error, { id: "toast-feedback-error" });
  useToastMessageEffect("info", info, { id: "toast-feedback-info" });
  useToastMessageEffect("warning", warning, { id: "toast-feedback-warning" });
  useToastMessageEffect("success", success, { id: "toast-feedback-success" });

  return null;
}
