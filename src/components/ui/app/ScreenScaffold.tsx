import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { headerTokens } from "@/components/ui/app/headerTokens";

export function ScreenScaffold({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("bg-[rgb(var(--bg))]", headerTokens.topGap, className)}>{children}</section>;
}
