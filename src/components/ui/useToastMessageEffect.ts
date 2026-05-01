"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastMessageEffectOptions = {
  id?: string;
  durationMs?: number;
};

export function useToastMessageEffect(
  tone: ToastTone,
  message: string | null | undefined,
  options?: ToastMessageEffectOptions,
) {
  const toast = useToast();
  const lastShownKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedMessage = message?.trim();

    if (!normalizedMessage) {
      lastShownKeyRef.current = null;
      return;
    }

    const nextKey = `${tone}:${options?.id ?? normalizedMessage}`;
    if (lastShownKeyRef.current === nextKey) {
      return;
    }

    lastShownKeyRef.current = nextKey;
    toast[tone](normalizedMessage, {
      id: options?.id,
      durationMs: options?.durationMs,
    });
  }, [message, options?.durationMs, options?.id, toast, tone]);
}
