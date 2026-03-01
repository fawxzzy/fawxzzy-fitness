"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEventHandler } from "react";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

type BackButtonProps = {
  href?: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  iconOnly?: boolean;
};

const baseClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-[rgb(var(--text)/0.8)] transition hover:text-[rgb(var(--text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-0";

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 text-accent/80 transition-colors group-hover:text-accent"
    >
      <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackButton({
  href,
  label = "Back",
  ariaLabel,
  className = "",
  onClick,
  iconOnly = false,
}: BackButtonProps) {
  const router = useRouter();
  const classes = iconOnly
    ? getAppButtonClassName({
        variant: "ghost",
        size: "sm",
        className: ["min-w-10 rounded-full px-2", className].filter(Boolean).join(" "),
      })
    : `${baseClassName} ${className}`.trim();
  const resolvedAriaLabel = ariaLabel ?? (iconOnly ? label : undefined);

  const content = iconOnly
    ? <BackIcon />
    : (
        <>
          <BackIcon />
          <span>{label}</span>
        </>
      );

  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-label={resolvedAriaLabel} className={`group ${classes}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={resolvedAriaLabel}
      className={`group ${classes}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        router.back();
      }}
    >
      {content}
    </button>
  );
}
