import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CompactLogRow({
  label,
  summary,
  meta,
  action,
  className,
}: {
  label: ReactNode;
  summary: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.34)] px-3 py-2.5",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-none text-muted">
          {label}
        </div>
        <div className="min-w-0 text-sm leading-snug text-[rgb(var(--text)/0.94)]">{summary}</div>
        {meta ? <div className="flex flex-wrap items-center gap-1.5">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
