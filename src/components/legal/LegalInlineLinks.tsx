import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function buildLegalHref(pathname: "/privacy" | "/terms", returnTo?: string) {
  if (!returnTo) {
    return pathname;
  }

  return {
    pathname,
    query: {
      returnTo,
    },
  };
}

export function LegalInlineLinks({
  className,
  linkClassName,
  separator,
  separatorClassName,
  returnTo,
}: {
  className?: string;
  linkClassName?: string;
  separator?: ReactNode;
  separatorClassName?: string;
  returnTo?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1", className)}>
      <Link href={buildLegalHref("/privacy", returnTo)} className={cn("underline-offset-4 hover:underline", linkClassName)}>
        Privacy Policy
      </Link>
      {separator ?? (
        <span aria-hidden="true" className={cn("text-[rgb(var(--text-muted)/0.72)]", separatorClassName)}>
          |
        </span>
      )}
      <Link href={buildLegalHref("/terms", returnTo)} className={cn("underline-offset-4 hover:underline", linkClassName)}>
        Terms of Service
      </Link>
    </span>
  );
}
