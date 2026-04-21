import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function CompactLogRow({
  summary,
  action,
  className,
  actionClassName,
}: {
  label?: ReactNode;
  summary: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  actionClassName?: string;
}) {
  return (
    <div className={cn(appTokens.exerciseLogRow, className)}>
      <div className="min-w-0 flex-1">
        {summary}
      </div>
      {action ? <div className={cn("flex shrink-0 items-stretch self-stretch", actionClassName)}>{action}</div> : null}
    </div>
  );
}
