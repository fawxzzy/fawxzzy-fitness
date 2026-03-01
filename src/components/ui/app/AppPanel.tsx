import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppPanel({
  children,
  className,
  clip = false,
}: {
  children: ReactNode;
  className?: string;
  clip?: boolean;
}) {
  return <div className={cn(appTokens.panelBase, clip ? "overflow-hidden" : undefined, className)}>{children}</div>;
}
