import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appTokens.panelBase, className)}>{children}</div>;
}
