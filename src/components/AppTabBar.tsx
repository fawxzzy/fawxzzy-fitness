"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { JSX, SVGProps } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  APP_TAB_DESTINATIONS,
  isDevPath,
  isKeyboardSqueezingLayout,
  resolveActiveTabHref,
  resolveAppTabBarPath,
  resolveAppTabBarVisibility,
  type AppTabDestination,
} from "@/lib/app-tabs";
import { cn } from "@/lib/cn";

// The bottom tab bar (docs/mobile-shell-contract.md "Bottom tab bar", DESIGN-CONTRACT.md 15.6). One instance, in the
// root layout as an in-flow sibling AFTER <main>: main shrinks by the bar's height, so content and screen docks
// always end above it and nothing scrolls behind it. WHERE it shows is decided only by `resolveAppTabBarVisibility`
// (src/lib/app-tabs.ts). When hidden it renders nothing, so `body:has(> [data-app-tab-bar])` in globals.css tells
// docks above it to drop their own home-indicator padding (the bar already carries the safe area).

type TabIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const TAB_ICONS: Record<string, TabIcon> = {
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

type TabLink = AppTabDestination & { Icon: TabIcon };

const tabs: TabLink[] = APP_TAB_DESTINATIONS.map((destination) => {
  const Icon = TAB_ICONS[destination.href];
  if (!Icon) {
    throw new Error(`AppTabBar: no icon for ${destination.href}`);
  }
  return { ...destination, Icon };
});

// Token-only classes (no raw colours). Opaque app background with one hairline on top; the active tab is the accent
// colour plus a short accent bar at the top edge. Every link is a full quarter of the width and 56px tall (44px floor).
export const appTabBarTokens = {
  nav:
    "relative z-10 flex-none border-t border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--bg-app))] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
  list: "mx-auto grid w-full max-w-[720px] grid-cols-4",
  link:
    "relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-none outline-none [-webkit-tap-highlight-color:transparent] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--accent)/0.7)] motion-reduce:transition-none",
  linkActive: "font-semibold text-[rgb(var(--accent))]",
  linkIdle: "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] active:text-[rgb(var(--text-primary))]",
  activeBar: "absolute left-1/2 top-0 h-[2px] w-8 -translate-x-1/2 rounded-full bg-[rgb(var(--accent))]",
  icon: "h-[22px] w-[22px] shrink-0",
  label: "max-w-full truncate",
} as const;

// --- Small external store: in-route editors that hide the bar, and the /dev preview path. ---

type TabBarStoreState = { suppressors: number; previewPathname: string | null };

let storeState: TabBarStoreState = { suppressors: 0, previewPathname: null };
const SERVER_STATE: TabBarStoreState = { suppressors: 0, previewPathname: null };
const listeners = new Set<() => void>();

function setStoreState(next: TabBarStoreState) {
  storeState = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useTabBarStore() {
  return useSyncExternalStore(subscribe, () => storeState, () => SERVER_STATE);
}

/**
 * Hides the bar while `active` is true, for a screen that stays on its route but turns into an editor (History
 * session Edit with its Cancel / Save dock). The visibility rule itself stays in `resolveAppTabBarVisibility`.
 */
export function useHideAppTabBar(active: boolean) {
  useEffect(() => {
    if (!active) return;
    setStoreState({ ...storeState, suppressors: storeState.suppressors + 1 });
    return () => {
      setStoreState({ ...storeState, suppressors: Math.max(0, storeState.suppressors - 1) });
    };
  }, [active]);
}

/** `/dev` fixtures only: show the bar exactly as the product route `pathname` would. Ignored outside `/dev`. */
export function AppTabBarPreview({ pathname }: { pathname: string | null }) {
  useEffect(() => {
    if (!pathname) return;
    setStoreState({ ...storeState, previewPathname: pathname });
    return () => {
      if (storeState.previewPathname === pathname) {
        setStoreState({ ...storeState, previewPathname: null });
      }
    };
  }, [pathname]);
  return null;
}

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image", "hidden"].includes(element.type);
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

/** True only where the browser shrinks the layout viewport for the keyboard (see `isKeyboardSqueezingLayout`). */
function useKeyboardSqueezesLayout(): boolean {
  const [squeezed, setSqueezed] = useState(false);

  useEffect(() => {
    let baseline = window.innerHeight;
    let frame = 0;

    const sync = () => {
      const editableFocused = isEditableElement(document.activeElement);
      if (!editableFocused) {
        baseline = window.innerHeight;
      } else {
        baseline = Math.max(baseline, window.innerHeight);
      }
      setSqueezed(isKeyboardSqueezingLayout({ baselineHeight: baseline, currentHeight: window.innerHeight, editableFocused }));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(sync);
    };
    const resetBaseline = () => {
      baseline = 0;
      schedule();
    };

    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", resetBaseline);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", resetBaseline);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, []);

  return squeezed;
}

export function AppTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { suppressors, previewPathname } = useTabBarStore();
  const keyboardOpen = useKeyboardSqueezesLayout();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isDev = isDevPath(pathname);
  const decisionPath = resolveAppTabBarPath(pathname, previewPathname);
  const visible = resolveAppTabBarVisibility({ pathname: decisionPath, suppressed: suppressors > 0, keyboardOpen });
  const activeHref = pendingHref ?? resolveActiveTabHref(decisionPath);

  // A finished navigation clears the optimistic highlight.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Warm the four tabs so a tap feels instant. Never on /dev (dev fixtures stay inert).
  useEffect(() => {
    if (!visible || isDev) return;
    for (const tab of tabs) {
      router.prefetch(tab.href);
    }
  }, [isDev, router, visible]);

  if (!visible) {
    return null;
  }

  return (
    <nav aria-label="Sections" data-app-tab-bar="" className={appTabBarTokens.nav}>
      <ul className={appTabBarTokens.list}>
        {tabs.map(({ href, label, Icon }) => {
          const isActive = activeHref === href;
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                prefetch={isDev ? false : undefined}
                aria-current={isActive && !pendingHref ? "page" : undefined}
                data-app-tab={href}
                data-active={isActive ? "true" : undefined}
                className={cn(appTabBarTokens.link, isActive ? appTabBarTokens.linkActive : appTabBarTokens.linkIdle)}
                onClick={(event) => {
                  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (decisionPath === href) return;
                  setPendingHref(href);
                }}
              >
                {isActive ? <span aria-hidden="true" className={appTabBarTokens.activeBar} /> : null}
                <Icon aria-hidden="true" className={appTabBarTokens.icon} />
                <span className={appTabBarTokens.label}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
