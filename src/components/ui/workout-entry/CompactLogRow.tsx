import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CompactLogRow({
  summary,
  action,
  className,
}: {
  label?: ReactNode;
  summary: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-stretch justify-between gap-0 overflow-hidden rounded-[1rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.34)]",
        className,
      )}
    >
      <div className="min-w-0 flex-1 px-3 py-2.5">
        {summary}
      </div>
      {action ? <div className="flex shrink-0 items-stretch">{action}</div> : null}
    </div>
  );
}
