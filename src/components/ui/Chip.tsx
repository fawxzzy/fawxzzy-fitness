import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { PillButton } from "@/components/ui/Pill";

type ChipTone = "default" | "today" | "success" | "warning" | "destructive";

export function Chip({
  children,
  tone = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return (
    <AppBadge tone={tone} className={className} {...props}>
      {children}
    </AppBadge>
  );
}

export function ChipButton({
  children,
  className,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: Exclude<ChipTone, "today">;
}) {
  return (
    <PillButton tone={tone} className={className} {...props}>
      {children}
    </PillButton>
  );
}
