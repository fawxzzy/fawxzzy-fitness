"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/ToastProvider";

export function useUndoAction(durationMs = 6000) {
  const toast = useToast();

  return useCallback((params: {
    message: string;
    onCommit: () => void | Promise<void>;
    onUndo: () => void;
    undoLabel?: string;
  }) => {
    const timeout = window.setTimeout(() => {
      void params.onCommit();
    }, durationMs);

    toast.success(params.message, {
      durationMs,
      action: {
        label: params.undoLabel ?? "Undo",
        onClick: () => {
          window.clearTimeout(timeout);
          params.onUndo();
        },
      },
    });
  }, [durationMs, toast]);
}
