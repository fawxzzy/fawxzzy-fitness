import type { ReactNode } from "react";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function DetailHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  action,
  children,
  className,
  actionClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="exerciseDetail"
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      action={action}
      meta={meta}
      className={className}
      actionClassName={actionClassName}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function DetailSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <TitleText as="h3" className="text-base">{title}</TitleText>
          {description ? <SubtitleText className="text-sm">{description}</SubtitleText> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </AppPanel>
  );
}

export function DetailMetaRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1.5", className)}>{children}</div>;
}

export function DetailMetaChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        emphasized
          ? "border-[rgb(var(--button-primary-border)/0.45)] bg-[rgb(var(--button-primary-bg)/0.18)] text-slate-100"
          : "border-white/10 bg-white/5 text-slate-300",
      )}
    >
      <span className="text-slate-400">{label}</span>
      <span className="ml-1 text-slate-100">{value}</span>
    </div>
  );
}
