"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ToastMessageCard } from "@/components/ui/ToastMessageCard";

type ToastTone = "info" | "success" | "warning" | "error";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  isExiting?: boolean;
  /** Set for screen-owned notices: the pathname they belong to. */
  ownerPathname?: string | null;
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
  /**
   * A screen-owned notice (e.g. Today's persistent "That workout could not be found."): dismissed as soon as the
   * pathname changes, so it never follows the person onto another tab.
   */
  dismissOnRouteChange?: boolean;
};

const ToastContext = createContext<ToastContextValue | null>(null);
// Where a screen shell lets error notices sit IN FLOW under its header (see `useNoticeFlowSlotRef`).
const NoticeFlowSlotContext = createContext<((node: HTMLElement | null) => void) | null>(null);

/**
 * Callback ref for the shell's in-flow notice slot (`MobileScreenShell`, between the header and the scroll area).
 * While a slot is mounted, ERROR notices render inside it, in flow, so the content below moves down instead of being
 * covered (Zac 2026-11-23: a failed-discard notice hid the first card's title). Without a provider or a slot the
 * notice falls back to the floating stack. Other tones stay floating: they vanish by themselves, and a layout jump
 * for a 2 s "Saved" would be worse than the overlap.
 */
export function useNoticeFlowSlotRef() {
  return useContext(NoticeFlowSlotContext);
}
/**
 * Where a screen shell puts its notice slot. "under-header" (default): in flow between the header and the scroll area.
 * "above-dock": an overlay pinned just above the bottom dock, out of flow, so a notice never moves a card (the workout
 * screen, Zac 2026-11-24). Read from the slot's data-app-notice-placement attribute.
 */
export type NoticePlacement = "under-header" | "above-dock";
const EXIT_ANIMATION_MS = 300;
const DEFAULT_DURATION_MS = 2200;
// Errors carry a reason and a next step, so they stay long enough to read (DESIGN-CONTRACT C16).
export const ERROR_TOAST_DURATION_MS = 6000;
// Above-dock notices: one at a time, gone after about 4 s; errors stay until dismissed or the next action.
export const DOCK_NOTICE_DURATION_MS = 4000;
const MAX_TOASTS = 3;
// A tap on one of these (outside the notice) is "the next action" that clears an above-dock error.
const NEXT_ACTION_SELECTOR = 'button, a[href], input, select, textarea, label, [role="button"], [role="switch"]';

function isDockOverlaySlot(slot: HTMLElement | null) {
  return slot?.getAttribute("data-app-notice-placement") === "above-dock";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [flowSlot, setFlowSlotState] = useState<HTMLElement | null>(null);
  // push() reads the slot synchronously (one-at-a-time and the timers depend on it), so keep it in a ref too.
  const flowSlotRef = useRef<HTMLElement | null>(null);
  const setFlowSlot = useCallback((node: HTMLElement | null) => {
    flowSlotRef.current = node;
    setFlowSlotState(node);
  }, []);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  // Layout effects run before any passive effect, so a notice pushed from a child's effect on the new route is tagged
  // with the new pathname, not the previous one.
  useLayoutEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

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
    const nextToast: ToastItem = {
      id,
      tone,
      message,
      isExiting: false,
      action: options?.action,
      ownerPathname: options?.dismissOnRouteChange ? pathnameRef.current : undefined,
    };
    if (isDockOverlaySlot(flowSlotRef.current)) {
      // One notice at a time: the new one replaces whatever is showing (an error included: this is the next action).
      dismissTimersRef.current.forEach((timer, timerId) => {
        if (timerId !== id) {
          window.clearTimeout(timer);
          dismissTimersRef.current.delete(timerId);
        }
      });
      exitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      exitTimersRef.current.clear();
      setToasts([nextToast]);
      const existing = dismissTimersRef.current.get(id);
      if (existing) {
        window.clearTimeout(existing);
        dismissTimersRef.current.delete(id);
      }
      if (tone === "error" || options?.persistent) {
        return;
      }
      scheduleDismiss(id, options?.durationMs ?? DOCK_NOTICE_DURATION_MS);
      return;
    }
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

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.ownerPathname !== undefined && toast.ownerPathname !== pathname && !toast.isExiting) {
        dismiss(toast.id);
      }
    });
  }, [pathname, toasts, dismiss]);

  const isDockOverlay = isDockOverlaySlot(flowSlot);
  const openDockErrorIds = isDockOverlay
    ? toasts.filter((toast) => toast.tone === "error" && !toast.isExiting).map((toast) => toast.id).join(" ")
    : "";
  // An above-dock error stays until it is dismissed or the person's next action: the next tap on a control outside
  // the notice clears it (a new notice replaces it too, in push()).
  useEffect(() => {
    if (!openDockErrorIds) return;
    const ids = openDockErrorIds.split(" ");
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('[data-app-notice-dock-stack="true"]')) return;
      if (!target.closest(NEXT_ACTION_SELECTOR)) return;
      ids.forEach((id) => dismiss(id));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [openDockErrorIds, dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      info: (message: string, options?: ToastOptions) => push("info", message, options),
      success: (message: string, options?: ToastOptions) => push("success", message, options),
      warning: (message: string, options?: ToastOptions) => push("warning", message, options),
      error: (message: string, options?: ToastOptions) => push("error", message, options),
    }),
    [push],
  );

  const renderCard = (toast: ToastItem) => (
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
  );
  // The shell says which tones go in flow (data-app-notice-flow-tones, fixed per screen): errors by default, every tone
  // on screens that opt in with noticesInFlow="all". An above-dock slot (the workout screen) takes every tone, one at a
  // time, out of flow, so a notice never moves a card.
  const flowAllTones = isDockOverlay || flowSlot?.getAttribute("data-app-notice-flow-tones") === "all";
  const isFlowToast = (toast: ToastItem) => flowAllTones || toast.tone === "error";
  const flowToasts = flowSlot ? toasts.filter(isFlowToast) : [];
  const floatingToasts = flowSlot ? toasts.filter((toast) => !isFlowToast(toast)) : toasts;
  const dockToast = isDockOverlay ? flowToasts[flowToasts.length - 1] : undefined;

  return (
    <ToastContext.Provider value={value}>
      <NoticeFlowSlotContext.Provider value={setFlowSlot}>
        {children}
        {/* Above-dock notice: portalled into the shell's overlay slot (absolute, just above the bottom dock), so it never
            moves a card. One at a time, centred; a tap on the notice (outside its buttons) dismisses it, as does X. */}
        {flowSlot && isDockOverlay && dockToast
          ? createPortal(
            <div data-app-notice-dock-stack="true" className="px-[var(--app-notice-inset-x)]">
              <div
                className="mx-auto flex max-w-[var(--app-notice-max-width)] flex-col items-center"
                onClick={(event) => {
                  const target = event.target instanceof Element ? event.target : null;
                  if (target?.closest("button")) return;
                  dismiss(dockToast.id);
                }}
              >
                {renderCard(dockToast)}
              </div>
            </div>,
            flowSlot,
          )
          : null}
        {/* In-flow error notices: portalled into the shell's slot under the header (right-anchored, wraps to two
            lines at 320px). 8px above (the anchor gap) and below keep it off the header and the first card. */}
        {flowSlot && !isDockOverlay && flowToasts.length > 0
          ? createPortal(
            <div data-app-notice-flow-stack="true" className="px-[var(--app-notice-inset-x)] pb-2 pt-2">
              <div className="ml-auto flex max-w-[var(--app-notice-max-width)] flex-col items-end gap-2">
                {flowToasts.map(renderCard)}
              </div>
            </div>,
            flowSlot,
          )
          : null}
        {/* Notice stack (DESIGN-CONTRACT C16): anchored top-right just under the screen's header row via the shared
            --app-notice-top / --app-notice-inset-x variables (MobileScreenShell keeps --app-notice-top in sync with
            the real header). Cards shrink-wrap to their text and grow leftward up to the full gutter-to-gutter width. */}
        <div
          data-app-notice-stack="true"
          className="pointer-events-none fixed left-[var(--app-notice-inset-x)] right-[var(--app-notice-inset-x)] top-[var(--app-notice-top)] z-[110] ml-auto flex max-w-[var(--app-notice-max-width)] flex-col items-end gap-2"
        >
          {floatingToasts.map(renderCard)}
        </div>
      </NoticeFlowSlotContext.Provider>
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
