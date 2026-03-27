"use client";

import type { MouseEventHandler } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";

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
        standaloneHeaderFamily.actionButtonClassName,
        className,
      ].filter(Boolean).join(" ")}
      iconOnly
      historyBehavior={historyBehavior}
    />
  );
}
