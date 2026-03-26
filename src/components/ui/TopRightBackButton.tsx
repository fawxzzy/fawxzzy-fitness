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
        "h-10 w-10 rounded-full border border-white/18 bg-[rgb(var(--surface-rgb)/0.58)] px-0 shadow-[0_10px_22px_-12px_rgba(0,0,0,0.92)] hover:border-white/30 hover:bg-[rgb(var(--surface-rgb)/0.78)]",
        className,
      ].filter(Boolean).join(" ")}
      iconOnly
      historyBehavior={historyBehavior}
    />
  );
}
