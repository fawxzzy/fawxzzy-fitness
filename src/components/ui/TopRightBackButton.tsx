"use client";

import type { MouseEventHandler } from "react";
import { BackButton } from "@/components/ui/BackButton";

type TopRightBackButtonProps = {
  href?: string;
  historyBehavior?: "history-first" | "fallback-only";
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  className?: string;
};

export function TopRightBackButton({ href, ariaLabel = "Back", onClick, historyBehavior = "history-first", className }: TopRightBackButtonProps) {
  return (
    <BackButton
      href={href}
      label={ariaLabel}
      ariaLabel={ariaLabel}
      onClick={onClick}
      className={[
        "min-h-11 min-w-11 rounded-full border border-white/14 bg-[rgb(var(--surface-rgb)/0.48)] px-0 shadow-[0_8px_18px_-12px_rgba(0,0,0,0.88)] hover:border-white/24 hover:bg-[rgb(var(--surface-rgb)/0.72)]",
        className,
      ].filter(Boolean).join(" ")}
      iconOnly
      historyBehavior={historyBehavior}
    />
  );
}
