"use client";

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

// The ONE action menu (docs/ui/FOUNDATION.md "Menu"): a 44x44 trigger, usually top right on a card or header, that
// opens a small popover right-aligned under it. Same look as the app menu (AppNav.tsx, DESIGN-CONTRACT.md section
// 15): opaque panel, accent keyline, 44px rows. Behaviour: opens with focus on the first row; ArrowUp/ArrowDown
// wrap, Home/End jump; Escape closes and returns focus to the trigger; Tab closes; a tap outside only closes (the
// click under the finger is swallowed, like a scrim); picking a row closes, returns focus, then runs the action.
// The panel is portaled to <body> (z 115 = --z-menu) so toasts never cover it and a sheet (120) always does.

export type MenuItemTone = "default" | "danger";

export type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: MenuItemTone;
  disabled?: boolean;
};

export type MenuProps = {
  /** Accessible name of the trigger ("Day actions", "Routine options"). */
  label: string;
  items: MenuItem[];
  /** Trigger content; defaults to a vertical three-dot icon. */
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  /** Called when the open state changes (for analytics or to pause other UI). */
  onOpenChange?: (open: boolean) => void;
  /** Panel min width in px (default 176, the app menu width). */
  minWidth?: number;
};

export const menuTokens = {
  trigger:
    "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[rgb(var(--text-secondary))] transition-colors hover:bg-[rgb(var(--surface-2)/0.6)] hover:text-[rgb(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] aria-expanded:bg-[rgb(var(--surface-2)/0.7)] aria-expanded:text-[rgb(var(--text-primary))] [-webkit-tap-highlight-color:transparent]",
  panel:
    "fixed z-[115] origin-top-right rounded-[10px] border border-[rgb(var(--accent)/0.62)] bg-[rgb(var(--surface-1-rgb))] py-1.5 shadow-[0_0_18px_rgb(var(--accent)/0.16),0_18px_40px_rgb(var(--bg-0)/0.55)] outline-none",
  // Row colours use `[button&]:` (`button.cls`, 0,1,1) so they beat the unlayered global `button, [type="button"]`
  // surface rule in globals.css, which otherwise boxed every row and hid the danger red (ui-kit capture 2026-11-24).
  row:
    "mx-1 flex h-11 w-[calc(100%-0.5rem)] items-center gap-3 rounded-[7px] pl-4 pr-3 text-left text-[15px] font-medium outline-none [button&]:border-0 [button&]:bg-transparent transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--accent)/0.7)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none [-webkit-tap-highlight-color:transparent]",
  rowDefault:
    "[button&]:text-[rgb(var(--text-secondary))] [button&]:hover:bg-[rgb(var(--surface-2)/0.7)] [button&]:hover:text-[rgb(var(--text-primary))] [button&]:focus:bg-[rgb(var(--surface-2)/0.7)] [button&]:focus:text-[rgb(var(--text-primary))]",
  rowDanger:
    "[button&]:text-[rgb(var(--danger-rgb))] [button&]:hover:bg-[rgb(var(--danger-rgb)/0.1)] [button&]:focus:bg-[rgb(var(--danger-rgb)/0.1)]",
  icon: "inline-flex h-5 w-5 shrink-0 items-center justify-center",
} as const;

const PANEL_GAP_PX = 6;
const VIEWPORT_MARGIN_PX = 8;

let cancelPendingClickSwallow: (() => void) | null = null;

// Same rule as the app menu: the click that follows an outside pointerdown must not also press what is under the
// finger. Dropped on pointercancel (a scroll), the next pointerdown, or a key press.
function swallowNextClick() {
  cancelPendingClickSwallow?.();
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    cancel();
  };
  const cancel = () => {
    document.removeEventListener("click", swallow, true);
    document.removeEventListener("pointercancel", cancel, true);
    document.removeEventListener("pointerdown", cancel, true);
    document.removeEventListener("keydown", cancel, true);
    if (cancelPendingClickSwallow === cancel) cancelPendingClickSwallow = null;
  };
  document.addEventListener("click", swallow, true);
  document.addEventListener("pointercancel", cancel, true);
  document.addEventListener("pointerdown", cancel, true);
  document.addEventListener("keydown", cancel, true);
  cancelPendingClickSwallow = cancel;
}

/** Index of the next enabled row for a key, wrapping; -1 when nothing is enabled. Pure, exported for tests. */
export function nextEnabledMenuIndex(enabled: boolean[], current: number, key: "ArrowDown" | "ArrowUp" | "Home" | "End"): number {
  const count = enabled.length;
  if (!enabled.some(Boolean)) return -1;
  if (key === "Home") return enabled.indexOf(true);
  if (key === "End") return enabled.lastIndexOf(true);
  const step = key === "ArrowDown" ? 1 : -1;
  let index = current;
  for (let i = 0; i < count; i += 1) {
    index = (index + step + count) % count;
    if (enabled[index]) return index;
  }
  return current;
}

function KebabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <circle cx="12" cy="5.5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="18.5" r="1.75" />
    </svg>
  );
}

export function Menu({ label, items, triggerIcon, triggerClassName, onOpenChange, minWidth = 176 }: MenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = useCallback(
    (returnFocus: boolean) => {
      setOpenState(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    [setOpenState],
  );

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    setPosition({
      top: Math.round(rect.bottom + PANEL_GAP_PX),
      right: Math.max(VIEWPORT_MARGIN_PX, Math.round(viewportWidth - rect.right)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const firstEnabled = items.findIndex((item) => !item.disabled);
    if (firstEnabled >= 0) itemRefs.current[firstEnabled]?.focus();
    else panelRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (panelRef.current?.contains(target) || triggerRef.current?.contains(target))) return;
      swallowNextClick();
      close(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const handleViewportChange = () => place();

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
    // Focus entry and listeners belong to one open; items are read at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, close, place]);

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      close(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const current = itemRefs.current.findIndex((element) => element === document.activeElement);
    const next = nextEnabledMenuIndex(items.map((item) => !item.disabled), current < 0 ? -1 : current, event.key);
    if (next >= 0) itemRefs.current[next]?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpenState(true);
    }
  };

  const panel = open ? (
    <div
      ref={panelRef}
      id={menuId}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      data-menu-panel=""
      className={menuTokens.panel}
      style={{ top: position?.top ?? 0, right: position?.right ?? VIEWPORT_MARGIN_PX, minWidth, visibility: position ? "visible" : "hidden" }}
      onKeyDown={handlePanelKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          type="button"
          role="menuitem"
          tabIndex={-1}
          disabled={item.disabled}
          data-menu-item={item.id}
          className={cn(menuTokens.row, item.tone === "danger" ? menuTokens.rowDanger : menuTokens.rowDefault)}
          onClick={() => {
            close(true);
            item.onSelect();
          }}
        >
          {item.icon ? <span aria-hidden="true" className={menuTokens.icon}>{item.icon}</span> : null}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-menu-trigger=""
        className={cn(menuTokens.trigger, triggerClassName)}
        onClick={() => (open ? close(false) : setOpenState(true))}
        onKeyDown={handleTriggerKeyDown}
      >
        {triggerIcon ?? <KebabIcon />}
      </button>
      {panel && typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </>
  );
}
