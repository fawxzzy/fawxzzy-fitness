import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppBadge({ tone = "default", children, className }: { tone?: "today" | "default"; children: ReactNode; className?: string }) {
  return (
    <span className={cn(tone === "today" ? appTokens.todayBadge : appTokens.defaultBadge, className)}>
      {children}
    </span>
  );
}
