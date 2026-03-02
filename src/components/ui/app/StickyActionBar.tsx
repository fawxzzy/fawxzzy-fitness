import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function StickyActionBar({
  primary,
  secondary,
  stickyOffset,
  className,
  mode = "sticky",
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  stickyOffset?: string;
  className?: string;
  mode?: "sticky" | "fixed";
}) {
  if (mode === "fixed") {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto mx-auto w-full max-w-md px-3 pb-0">
          <div className={cn(appTokens.stickyBar, className)}>
            <div className="space-y-2">
              {primary}
              {secondary ?? null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("sticky bottom-0 z-20 -mx-1", appTokens.stickyBar, className)} style={stickyOffset ? { bottom: stickyOffset } : undefined}>
      <div className="space-y-2">
        {primary}
        {secondary ?? null}
      </div>
    </div>
  );
}
