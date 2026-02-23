"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SVGProps } from "react";
import { useEffect } from "react";
import { Glass } from "@/components/ui/Glass";

type NavLink = {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

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
    label: "Settings",
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

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeLink = links.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  useEffect(() => {
    for (const link of links) {
      if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
        continue;
      }

      router.prefetch(link.href);
    }
  }, [pathname, router]);

  return (
    <Glass variant="raised" className="sticky top-3 z-20 px-2 py-1.5" interactive={false}>
      <p className="px-2 pb-1 text-center text-sm font-semibold text-text">{activeLink?.label ?? "Fawxzzy Fitness"}</p>
      <nav className="grid grid-cols-4 gap-1 text-center text-xs" aria-label="App tabs">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.Icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              aria-current={isActive ? "page" : undefined}
              className={`group relative rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors ${
                isActive
                  ? "bg-accent/16 font-semibold text-accent"
                  : "text-[rgb(var(--text)/0.72)] hover:bg-[rgb(255_255_255/0.06)] hover:text-[rgb(var(--text)/0.88)]"
              }`}
            >
              <span className="flex flex-col items-center gap-1">
                <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-accent" : "text-[rgb(var(--text)/0.64)] group-hover:text-[rgb(var(--text)/0.76)]"}`} />
                <span>{link.label}</span>
              </span>
              {isActive ? <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>
    </Glass>
  );
}
