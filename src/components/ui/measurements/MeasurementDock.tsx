import type { ReactNode } from "react";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

export const measurementDockSurfaceClassName =
  "border-transparent bg-[rgb(var(--surface-1-rgb)/0.56)] shadow-[0_14px_30px_rgba(2,8,16,0.18)] backdrop-blur-[22px] supports-[backdrop-filter]:bg-[rgb(var(--surface-1-rgb)/0.4)]";

export function MeasurementDockSummary({
  lead,
  summary,
  trailing,
  className,
  barClassName,
  rowClassName,
  centerClassName,
}: {
  lead: ReactNode;
  summary: ReactNode;
  trailing?: ReactNode;
  className?: string;
  barClassName?: string;
  rowClassName?: string;
  centerClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-[52px] flex-col justify-center gap-1.5", className)}>
      <MetricAccentBar variant="thin" className={cn("w-full opacity-85", barClassName)} />
      <div className={cn("grid min-h-[1.5rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2", rowClassName)}>
        <div className="min-w-0 flex items-center justify-start">{lead}</div>
        <div className={cn("min-w-0 flex items-center justify-center", centerClassName)}>{summary}</div>
        <div className="min-w-0 flex items-center justify-end">{trailing}</div>
      </div>
    </div>
  );
}
