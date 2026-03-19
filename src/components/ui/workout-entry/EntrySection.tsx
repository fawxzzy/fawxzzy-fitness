import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function WorkoutEntrySection({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
  contentClassName,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("space-y-3 rounded-[1.35rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.48)] p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">{title}</p>
            {description ? <p className="text-sm text-muted">{description}</p> : null}
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className={cn("space-y-3", contentClassName)}>{children}</div>
    </section>
  );
}

export function WorkoutEntryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border px-3 py-2.5", tone === "warning" ? "border-amber-400/20 bg-amber-400/10" : "border-white/8 bg-white/5")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={cn("mt-1 text-sm font-medium", tone === "warning" ? "text-amber-100" : "text-text")}>{value}</p>
    </div>
  );
}
