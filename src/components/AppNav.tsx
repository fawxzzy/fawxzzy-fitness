"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, SVGProps } from "react";
import { useEffect, useState } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { Glass } from "@/components/ui/Glass";

type NavLink = {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

type AppNavProps = {
  mode?: "fixed" | "topChrome";
};

const NAV_PENDING_HINT_DELAY_MS = 140;

const links: NavLink[] = [
  {
    href: "/today",
    label: "Today",
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 8.25L12 3l9 5.25" />
        <path d="M5.25 9.75V21h13.5V9.75" />
      </svg>
    ),
  },
  {
    href: "/routines",
    label: "Routines",
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
        <path d="M4.5 4.5v4h4" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Account",
    Icon: (props) => (
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
  },
];

export function AppNav({ mode = "fixed" }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showPendingHint, setShowPendingHint] = useState(false);
  useEffect(() => {
    for (const link of links) {
      router.prefetch(link.href);
    }
  }, [router]);

  useEffect(() => {
    setPendingHref(null);
    setShowPendingHint(false);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) {
      return;
    }

    setShowPendingHint(false);

    const timer = window.setTimeout(() => {
      setShowPendingHint(true);
    }, NAV_PENDING_HINT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pendingHref]);

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string, isActive: boolean) {
    if (
      isActive ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    setPendingHref(href);
  }

  return (
    <div
      className={`pointer-events-none inset-x-0 flex max-w-full justify-center overflow-x-clip ${
        mode === "fixed"
          ? "fixed top-[calc(var(--app-top-nav-safe-top,var(--app-safe-top))+var(--header-floating-gap))] z-[60]"
          : "relative z-30"
      }`}
    >
      <ContentRail className="pointer-events-auto min-w-0">
        <Glass
          variant="raised"
          className="relative isolate min-h-[var(--header-h)] w-full rounded-[var(--card-radius)] border border-white/15 bg-[rgb(var(--glass-tint-rgb)/0.9)] px-2 pb-1 shadow-[0_8px_20px_rgb(0_0_0/0.26)] [--glass-current-border-alpha:0.3] [--glass-current-tint-alpha:0.88] supports-[backdrop-filter]:bg-[rgb(var(--glass-tint-rgb)/0.72)]"
          interactive={false}
        >
          <div className="flex h-[var(--header-h)] items-center justify-center pt-0.5">
            <nav className="grid grid-cols-4 gap-1 text-center text-xs" aria-label="App tabs">
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const isPending = !isActive && pendingHref === link.href && showPendingHint;
                const Icon = link.Icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    aria-current={isActive ? "page" : undefined}
                    aria-busy={isPending ? true : undefined}
                    onClick={(event) => handleNavClick(event, link.href, isActive)}
                    className={`group relative flex min-h-11 items-center justify-center rounded-[10px] px-2 py-1 transition-[transform,filter,background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985] active:brightness-[0.98] ${
                      isActive
                        ? "font-semibold text-[rgb(var(--accent)/0.98)]"
                        : "text-[rgb(var(--text)/0.72)] hover:bg-[rgb(255_255_255/0.06)] hover:text-[rgb(var(--text)/0.88)]"
                    }`}
                  >
                    <span className="flex flex-col items-center gap-0.5">
                      <Icon className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-[rgb(var(--accent)/0.98)]" : "text-[rgb(var(--text)/0.64)] group-hover:text-[rgb(var(--text)/0.76)]"}`} />
                      <span>{link.label}</span>
                    </span>
                    {isPending ? (
                      <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--accent)/0.88)] shadow-[0_0_10px_rgb(var(--accent)/0.4)]"
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </Glass>
      </ContentRail>
    </div>
  );
}
