import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

const toneClassNames = {
  today: appTokens.todayBadge,
  default: appTokens.defaultBadge,
  success: appTokens.successBadge,
  warning: appTokens.warningBadge,
  destructive: appTokens.destructiveBadge,
} as const;

export function AppBadge({
  tone = "default",
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneClassNames;
  children: ReactNode;
}) {
  return (
    <span className={cn(appTokens.badgeBase, toneClassNames[tone], className)} {...props}>
      {children}
    </span>
  );
}
