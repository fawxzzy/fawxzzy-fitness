"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEventHandler } from "react";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

type TopRightBackButtonProps = {
  href?: string;
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
};

export function TopRightBackButton({ href, ariaLabel = "Back", onClick }: TopRightBackButtonProps) {
  const router = useRouter();
  const className = getAppButtonClassName({
    variant: "secondary",
    className: "h-10 min-w-10 rounded-full px-3",
  });

  const icon = (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} onClick={onClick} className={className}>
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          router.back();
        }
      }}
    >
      {icon}
    </button>
  );
}
