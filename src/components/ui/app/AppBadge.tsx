import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

const toneClassNames = {
  today: appTokens.todayBadge,
  default: appTokens.defaultBadge,
  success: appTokens.successBadge,
  warning: appTokens.warningBadge,
  destructive: appTokens.destructiveBadge,
} as const;

export function AppBadge({ tone = "default", children, className }: { tone?: keyof typeof toneClassNames; children: ReactNode; className?: string }) {
  return (
    <span className={cn(appTokens.badgeBase, toneClassNames[tone], className)}>
      {children}
    </span>
  );
}
