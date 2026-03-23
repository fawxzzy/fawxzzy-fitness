import type { ReactNode } from "react";
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
    <div
      className={cn(
        "flex items-stretch justify-between gap-0 overflow-hidden rounded-[1rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.34)] shadow-[0_10px_22px_-20px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <div className="min-w-0 flex-1 px-3 py-2.5">
        {summary}
      </div>
      {action ? <div className={cn("flex shrink-0 items-stretch self-stretch", actionClassName)}>{action}</div> : null}
    </div>
  );
}
