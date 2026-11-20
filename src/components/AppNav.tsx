"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { JSX, KeyboardEvent, MouseEvent, SVGProps } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { APP_MENU_DESTINATIONS, nextMenuFocusIndex, resolveActiveMenuHref, type AppMenuDestination, type MenuKey } from "@/lib/app-menu";
import { cn } from "@/lib/cn";

// The app menu (DESIGN-CONTRACT.md section 15, "App menu"): one 44x44 button on the screen title line, top RIGHT,
// that opens a small panel with the four destinations. It replaces the old top tab bar. The look and motion follow
// Mazer's dropdown menu: hamburger that turns into an X, a narrow opaque panel right-aligned under the
// button with an accent keyline, 44px rows with an icon, the current screen marked by an accent tint and a 3px
// left bar, open 180ms / close 140ms with a short slide, rows fading in one after another; none of it under
// reduced motion. Closes on Escape, a tap outside, a pick, or the X; keyboard focus stays inside while open.

type NavIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

type NavLink = AppMenuDestination & { Icon: NavIcon };

const NAV_PENDING_HINT_DELAY_MS = 140;

let cancelPendingClickSwallow: (() => void) | null = null;

// A tap outside the open menu only closes it, like a modal scrim: the click that follows the outside `pointerdown`
// must not also press the button or link under the finger. Swallow exactly that one click (capture phase, before
// React sees it). If no click follows (a scroll turns the touch into `pointercancel`, or the next input is a new
// pointerdown or a key press), drop the swallow so a later, unrelated click or keyboard activation still works.
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
    if (cancelPendingClickSwallow === cancel) {
      cancelPendingClickSwallow = null;
    }
  };
  // Added while the current pointerdown is being dispatched on document, so this pointerdown listener only fires for
  // the NEXT pointerdown (DOM listeners added during dispatch to the same target are not invoked for that event).
  document.addEventListener("click", swallow, true);
  document.addEventListener("pointercancel", cancel, true);
  document.addEventListener("pointerdown", cancel, true);
  document.addEventListener("keydown", cancel, true);
  cancelPendingClickSwallow = cancel;
}

// Icons only. The destinations themselves (href, label, order) come from `APP_MENU_DESTINATIONS` in
// `src/lib/app-menu.ts`, the one list the active-route rules and the tests also read.
const NAV_ICONS: Record<string, NavIcon> = {
  "/today": (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8.25L12 3l9 5.25" />
      <path d="M5.25 9.75V21h13.5V9.75" />
    </svg>
  ),
  "/routines": (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  ),
  "/history": (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  ),
  "/settings": (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2.5" />
      <path d="M12 18.75v2.5" />
      <path d="M21.25 12h-2.5" />
      <path d="M5.25 12h-2.5" />
      <path d="m18.54 5.46-1.77 1.77" />
      <path d="m7.23 16.77-1.77 1.77" />
      <path d="m18.54 18.54-1.77-1.77" />
      <path d="m7.23 7.23-1.77-1.77" />
    </svg>
  ),
};

const links: NavLink[] = APP_MENU_DESTINATIONS.map((destination) => {
  const Icon = NAV_ICONS[destination.href];
  if (!Icon) {
    throw new Error(`AppMenu: no icon for ${destination.href}`);
  }
  return { ...destination, Icon };
});

// Token-only classes (no raw colours). z-[115]: above toasts (110), below sheets/modals (120); see the layer list
// in DESIGN-CONTRACT.md section 15. The panel is portaled to <body> with `fixed` placement: inside the header its
// z-index only counted within `<main>` (layout.tsx, `relative z-10`), so body-level toasts painted over it.
export const appMenuTokens = {
  root: "relative",
  toggle:
    "relative inline-flex h-11 w-11 items-center justify-center rounded-full !border-0 !bg-transparent text-[rgb(var(--text-secondary))] transition-colors hover:!bg-[rgb(var(--surface-2)/0.6)] hover:text-[rgb(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.6)] aria-expanded:text-[rgb(var(--text-primary))]",
  bar: "absolute left-0 h-[2px] w-5 rounded-full bg-current transition-[transform,opacity] duration-[180ms] ease-out motion-reduce:transition-none",
  panel:
    "fixed z-[115] w-[176px] origin-top-right rounded-[10px] border border-[rgb(var(--accent)/0.62)] bg-[rgb(var(--surface-1-rgb))] py-1.5 shadow-[0_0_18px_rgb(var(--accent)/0.16),0_18px_40px_rgb(var(--bg-0)/0.55)] motion-reduce:transition-none",
  // Visibility flips at once on open (a transitioning `visibility` stays hidden for the first frame, and the open
  // effect could not move focus into the panel) and only after the fade on close.
  panelOpen: "visible translate-y-0 opacity-100 [transition:opacity_180ms_ease-out,transform_180ms_ease-out,visibility_0s_linear_0s]",
  panelClosed:
    "pointer-events-none invisible -translate-y-2.5 opacity-0 [transition:opacity_140ms_ease-out,transform_140ms_ease-out,visibility_0s_linear_140ms]",
  row:
    "group relative mx-1 flex h-11 items-center gap-3 rounded-[7px] pl-4 pr-3 text-[15px] font-medium outline-none transition-[background-color,color,opacity,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--accent)/0.7)] motion-reduce:transition-none",
  rowActive: "bg-[rgb(var(--accent)/0.13)] font-semibold text-[rgb(var(--text-primary))]",
  rowIdle: "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-2)/0.7)] hover:text-[rgb(var(--text-primary))] active:bg-[rgb(var(--surface-2)/0.9)]",
  activeBar: "absolute inset-y-2 left-0 w-[3px] rounded-full bg-[rgb(var(--accent))]",
  icon: "h-5 w-5 shrink-0",
  pendingDot: "absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--accent)/0.88)] motion-reduce:animate-none",
} as const;

function menuKeyFromEvent(event: KeyboardEvent): MenuKey | null {
  if (event.key === "Tab") {
    return event.shiftKey ? "ShiftTab" : "Tab";
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
    return event.key;
  }
  return null;
}

export function AppMenu({ activePathnameOverride }: { activePathnameOverride?: string } = {}) {
  const pathname = usePathname();
  const activePathname = activePathnameOverride ?? pathname;
  const activeHref = resolveActiveMenuHref(activePathname);
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showPendingHint, setShowPendingHint] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [panelPlacement, setPanelPlacement] = useState({ top: 0, right: 0 });

  // The panel renders inline for the server pass and the first client render, then moves to <body>.
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Right-aligned 4px under the button (what the old in-header `absolute right-0 top-[calc(100%+4px)]` gave).
  const placePanel = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPanelPlacement({ top: Math.round(rect.bottom + 4), right: Math.round(document.documentElement.clientWidth - rect.right) });
  }, []);

  const openMenu = useCallback(() => {
    placePanel();
    setOpen(true);
  }, [placePanel]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      toggleRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname === "/dev" || pathname.startsWith("/dev/")) {
      return;
    }

    for (const link of links) {
      router.prefetch(link.href);
    }
  }, [pathname, router]);

  // A finished navigation closes the menu and clears the pending hint.
  useEffect(() => {
    setOpen(false);
    setPendingHref(null);
    setShowPendingHint(false);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) {
      return;
    }

    setShowPendingHint(false);
    const timer = window.setTimeout(() => setShowPendingHint(true), NAV_PENDING_HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  // Opening moves focus into the panel (the current screen's row, else the first row).
  useEffect(() => {
    if (!open) {
      return;
    }

    const activeIndex = links.findIndex((link) => link.href === activeHref);
    itemRefs.current[activeIndex >= 0 ? activeIndex : 0]?.focus();
  }, [open, activeHref]);

  // A tap or click anywhere outside the button and the panel closes it (focus is not pulled back on touch).
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && (rootRef.current?.contains(event.target) || panelRef.current?.contains(event.target))) {
        return;
      }
      swallowNextClick();
      setOpen(false);
    };

    // Escape while focus sits outside the menu (e.g. after a tap on the panel padding) still closes it. Inside the
    // menu the root key handler runs first and stops the event.
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleDocumentKeyDown);
    // The panel is `fixed` under <body>, so it follows the button when the viewport resizes or anything scrolls.
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleDocumentKeyDown);
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open, placePanel]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && event.target === toggleRef.current) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }

    const key = menuKeyFromEvent(event);
    if (!key) {
      return;
    }

    event.preventDefault();
    if (key === "Tab" || key === "ShiftTab") {
      // Focus trap: Tab cycles through the X button and the rows, never out of the open menu.
      const focusables: Array<HTMLElement | null> = [toggleRef.current, ...itemRefs.current];
      const current = focusables.findIndex((node) => node === document.activeElement);
      focusables[nextMenuFocusIndex(current, key, focusables.length)]?.focus();
      return;
    }

    const current = itemRefs.current.findIndex((node) => node === document.activeElement);
    itemRefs.current[nextMenuFocusIndex(current, key, links.length)]?.focus();
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string, isActive: boolean) {
    setOpen(false);
    if (
      isActive
      || event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    setPendingHref(href);
  }

  const isPending = Boolean(pendingHref) && showPendingHint;

  // React events from the portaled panel still bubble to the root's onKeyDown (React tree, not DOM tree), so the
  // focus trap and Escape keep working.
  const panel = (
    <nav
      ref={panelRef}
      id={panelId}
      aria-label="App menu"
      data-app-menu-panel={open ? "open" : "closed"}
      className={cn(appMenuTokens.panel, open ? appMenuTokens.panelOpen : appMenuTokens.panelClosed)}
      style={panelPlacement}
    >
      <ul className="flex flex-col">
        {links.map((link, index) => {
          const isActive = link.href === activeHref;
          const Icon = link.Icon;

          return (
            <li key={link.href}>
              <Link
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                href={link.href}
                prefetch
                tabIndex={open ? 0 : -1}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => handleNavClick(event, link.href, isActive)}
                className={cn(
                  appMenuTokens.row,
                  isActive ? appMenuTokens.rowActive : appMenuTokens.rowIdle,
                  open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
                )}
                style={{ transitionDelay: open ? `${40 + index * 35}ms` : "0ms" }}
              >
                {isActive ? <span aria-hidden="true" className={appMenuTokens.activeBar} /> : null}
                <Icon aria-hidden="true" className={cn(appMenuTokens.icon, isActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))]")} />
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div ref={rootRef} className={appMenuTokens.root} data-app-menu={open ? "open" : "closed"} onKeyDown={handleKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-busy={isPending ? true : undefined}
        data-app-menu-toggle="true"
        className={appMenuTokens.toggle}
        onClick={() => (open ? close(false) : openMenu())}
      >
        <span aria-hidden="true" className="relative block h-[14px] w-5">
          <span className={cn(appMenuTokens.bar, "top-0", open && "translate-y-[6px] rotate-45")} />
          <span className={cn(appMenuTokens.bar, "top-[6px]", open && "opacity-0")} />
          <span className={cn(appMenuTokens.bar, "top-[12px]", open && "-translate-y-[6px] -rotate-45")} />
        </span>
        {isPending ? <span aria-hidden="true" className={appMenuTokens.pendingDot} /> : null}
      </button>
      {portalTarget ? createPortal(panel, portalTarget) : panel}
    </div>
  );
}
