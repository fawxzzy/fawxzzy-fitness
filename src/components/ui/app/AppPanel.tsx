import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppPanel({
  children,
  className,
  clip = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  clip?: boolean;
}) {
  return (
    <div
      className={cn(
        appTokens.panelBase,
        "rounded-[var(--card-radius)]",
        clip ? "overflow-hidden" : "overflow-visible",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
