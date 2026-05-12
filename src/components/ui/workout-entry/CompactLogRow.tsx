import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function CompactLogRow({
  label,
  summary,
  meta,
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
        {label || meta ? (
          <div className="flex min-w-0 items-start justify-between gap-2 pb-1">
            {label ? <div className="min-w-0">{label}</div> : <span aria-hidden="true" />}
            {meta ? <div className="shrink-0">{meta}</div> : null}
          </div>
        ) : null}
        <div className="min-w-0">{summary}</div>
      </div>
      {action ? <div className={cn(appTokens.exerciseLogRowAction, actionClassName)}>{action}</div> : null}
    </div>
  );
}
