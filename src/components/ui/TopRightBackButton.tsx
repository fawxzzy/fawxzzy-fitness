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
  return <BackButton href={href} label={ariaLabel} ariaLabel={ariaLabel} onClick={onClick} className={className} iconOnly historyBehavior={historyBehavior} />;
}
