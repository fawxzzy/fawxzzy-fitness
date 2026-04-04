"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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

type ToastOptions = {
  durationMs?: number;
  id?: string;
  action?: ToastItem["action"];
};

const ToastContext = createContext<ToastContextValue | null>(null);
const EXIT_ANIMATION_MS = 240;
const DEFAULT_DURATION_MS = 2800;
const MAX_TOASTS = 3;

function toneClassName(tone: ToastTone) {
  if (tone === "info") {
    return "border-white/16 bg-[rgb(var(--surface-rgb)/0.84)] text-[rgb(var(--text)/0.92)]";
  }
  if (tone === "success") {
    return "border-emerald-300/40 bg-emerald-500/20 text-emerald-100";
  }
  if (tone === "warning") {
    return "border-amber-300/40 bg-amber-500/20 text-amber-100";
  }
  return "border-red-300/40 bg-red-500/20 text-red-100";
}

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
    scheduleDismiss(id, options?.durationMs ?? DEFAULT_DURATION_MS);
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
      <div className="pointer-events-none fixed right-3 top-[calc(var(--app-top-offset)+var(--app-top-chrome-content-gap,0px)+0.35rem)] z-50 flex w-[min(100%-1.5rem,22rem)] flex-col items-end gap-2 sm:right-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full rounded-lg border px-3 py-2 text-sm shadow-xl backdrop-blur-md transition-all duration-200 ${
              toast.isExiting ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
            } ${toneClassName(toast.tone)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="rounded border border-current/35 px-2 py-0.5 text-xs font-semibold"
                >
                  {toast.action.label}
                </button>
              ) : null}
            </div>
          </div>
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
