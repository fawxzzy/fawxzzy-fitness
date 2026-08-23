import Link from "next/link";
import type { ReactNode } from "react";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
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
  centerSeparator = false,
  className,
  linkClassName,
  separator,
  separatorClassName,
  returnTo,
}: {
  centerSeparator?: boolean;
  className?: string;
  linkClassName?: string;
  separator?: ReactNode;
  separatorClassName?: string;
  returnTo?: string;
}) {
  return (
    <span
      className={cn(
        centerSeparator
          ? "grid w-full grid-cols-[minmax(0,1fr)_0.465rem_minmax(0,1fr)] items-center gap-x-2"
          : "inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1",
        className,
      )}
    >
      <Link
        href={buildLegalHref("/privacy", returnTo)}
        className={cn(centerSeparator ? "justify-self-end" : "", "underline-offset-4 hover:underline", linkClassName)}
      >
        Privacy Policy
      </Link>
      {separator ?? (
        <SignatureMiniPipe className={separatorClassName} />
      )}
      <Link
        href={buildLegalHref("/terms", returnTo)}
        className={cn(centerSeparator ? "justify-self-start" : "", "underline-offset-4 hover:underline", linkClassName)}
      >
        Terms of Service
      </Link>
    </span>
  );
}
