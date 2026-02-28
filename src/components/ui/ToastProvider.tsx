"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ToastContextValue = {
  success: (message: string, options?: { durationMs?: number; action?: ToastItem["action"] }) => void;
  error: (message: string, options?: { durationMs?: number; action?: ToastItem["action"] }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClassName(tone: ToastTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, message: string, options?: { durationMs?: number; action?: ToastItem["action"] }) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, tone, message, action: options?.action }]);
    window.setTimeout(() => dismiss(id), options?.durationMs ?? 2800);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string, options?: { durationMs?: number; action?: ToastItem["action"] }) => push("success", message, options),
      error: (message: string, options?: { durationMs?: number; action?: ToastItem["action"] }) => push("error", message, options),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-50 flex flex-col items-center gap-2 px-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto w-full max-w-md rounded-md border px-3 py-2 text-sm shadow ${toneClassName(toast.tone)}`}>
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
