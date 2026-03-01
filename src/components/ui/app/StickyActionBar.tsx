import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function StickyActionBar({
  primary,
  secondary,
  stickyOffset,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  stickyOffset?: string;
  className?: string;
}) {
  return (
    <div className={cn(appTokens.stickyBar, className)} style={stickyOffset ? { bottom: stickyOffset } : undefined}>
      <div className="space-y-2">
        {primary}
        {secondary ?? null}
      </div>
    </div>
  );
}
