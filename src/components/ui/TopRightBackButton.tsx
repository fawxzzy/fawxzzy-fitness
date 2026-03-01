"use client";

import type { MouseEventHandler } from "react";
import { BackButton } from "@/components/ui/BackButton";

type TopRightBackButtonProps = {
  href?: string;
  ariaLabel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
};

export function TopRightBackButton({ href, ariaLabel = "Back", onClick }: TopRightBackButtonProps) {
  return <BackButton href={href} label={ariaLabel} ariaLabel={ariaLabel} onClick={onClick} iconOnly />;
}
