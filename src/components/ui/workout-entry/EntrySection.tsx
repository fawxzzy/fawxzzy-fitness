import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";

export function WorkoutEntrySection({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
  contentClassName,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <SharedSectionShell
      recipe="exerciseLog"
      label={eyebrow}
      context={title}
      meta={description}
      action={aside}
      className={cn("rounded-[1.35rem] border border-white/8 bg-[rgb(var(--surface-rgb)/0.48)]", className)}
      bodyClassName={cn("space-y-3", contentClassName)}
    >
      {children}
    </SharedSectionShell>
  );
}

export function WorkoutEntryIdentity({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="exerciseLog"
      eyebrow={eyebrow}
      title={title}
      subtitle={description}
      meta={meta}
      action={actions}
      className={className}
    />
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
