"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ToastMessageCard } from "@/components/ui/ToastMessageCard";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  isExiting?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ToastContextValue = {
  info: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
};

export type ToastOptions = {
  durationMs?: number;
  /** Stays until the person dismisses it (or a toast with the same id replaces it). For errors they must read. */
  persistent?: boolean;
  id?: string;
  action?: ToastItem["action"];
};

const ToastContext = createContext<ToastContextValue | null>(null);
const EXIT_ANIMATION_MS = 300;
const DEFAULT_DURATION_MS = 2200;
// Errors carry a reason and a next step, so they stay long enough to read (DESIGN-CONTRACT C16).
export const ERROR_TOAST_DURATION_MS = 6000;
const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());
  const exitTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => () => {
    dismissTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    dismissTimersRef.current.clear();
    exitTimersRef.current.clear();
  }, []);

  const remove = useCallback((id: string) => {
    const dismissTimer = dismissTimersRef.current.get(id);
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
      dismissTimersRef.current.delete(id);
    }
    const exitTimer = exitTimersRef.current.get(id);
    if (exitTimer) {
      window.clearTimeout(exitTimer);
      exitTimersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    const dismissTimer = dismissTimersRef.current.get(id);
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
      dismissTimersRef.current.delete(id);
    }

    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, isExiting: true } : toast)));
    const exitTimer = window.setTimeout(() => remove(id), EXIT_ANIMATION_MS);
    exitTimersRef.current.set(id, exitTimer);
  }, [remove]);

  const scheduleDismiss = useCallback((id: string, durationMs: number) => {
    const existing = dismissTimersRef.current.get(id);
    if (existing) {
      window.clearTimeout(existing);
    }
    const nextTimer = window.setTimeout(() => dismiss(id), durationMs);
    dismissTimersRef.current.set(id, nextTimer);
  }, [dismiss]);

  const push = useCallback((tone: ToastTone, message: string, options?: ToastOptions) => {
    const id = options?.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextToast: ToastItem = { id, tone, message, isExiting: false, action: options?.action };
    setToasts((current) => {
      const existingIndex = current.findIndex((toast) => toast.id === id);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = nextToast;
        return updated;
      }
      return [...current, nextToast].slice(-MAX_TOASTS);
    });
    if (options?.persistent) {
      const existing = dismissTimersRef.current.get(id);
      if (existing) {
        window.clearTimeout(existing);
        dismissTimersRef.current.delete(id);
      }
      return;
    }
    scheduleDismiss(id, options?.durationMs ?? (tone === "error" ? ERROR_TOAST_DURATION_MS : DEFAULT_DURATION_MS));
  }, [scheduleDismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      info: (message: string, options?: ToastOptions) => push("info", message, options),
      success: (message: string, options?: ToastOptions) => push("success", message, options),
      warning: (message: string, options?: ToastOptions) => push("warning", message, options),
      error: (message: string, options?: ToastOptions) => push("error", message, options),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Notice stack (DESIGN-CONTRACT C16): anchored top-right just under the screen's header row via the shared
          --app-notice-top / --app-notice-inset-x variables (MobileScreenShell keeps --app-notice-top in sync with
          the real header). Cards shrink-wrap to their text and grow leftward up to the full gutter-to-gutter width. */}
      <div
        data-app-notice-stack="true"
        className="pointer-events-none fixed left-[var(--app-notice-inset-x)] right-[var(--app-notice-inset-x)] top-[var(--app-notice-top)] z-[110] ml-auto flex max-w-[var(--app-notice-max-width)] flex-col items-end gap-2"
      >
        {toasts.map((toast) => (
          <ToastMessageCard
            key={toast.id}
            tone={toast.tone}
            message={toast.message}
            action={toast.action ? { label: toast.action.label } : undefined}
            onAction={toast.action ? () => {
              toast.action?.onClick();
              dismiss(toast.id);
            } : undefined}
            onDismiss={() => dismiss(toast.id)}
            isExiting={toast.isExiting}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
