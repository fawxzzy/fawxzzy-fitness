import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { formatCount, formatDateShort, formatDurationShort } from "@/lib/formatting";

export function HistoryPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <SharedScreenHeader
      recipe="historyDetail"
      title={title}
      subtitle={subtitle}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function HistoryDetailHeader({
  title,
  subtitle,
  eyebrow = "History",
  meta,
  action,
  children,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="historyDetail"
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      action={action}
      meta={meta}
      className={className}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function HistorySection({
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

export function HistoryControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <AppPanel className={cn("space-y-2 p-3 max-md:space-y-1.5", className)}>{children}</AppPanel>;
}

export function HistoryTitleControlShell({
  label,
  caption,
  viewMode,
  onViewModeChange,
  showViewModeToggle = true,
  children,
  className,
}: {
  label?: string;
  caption?: string;
  viewMode: "compact" | "detailed";
  onViewModeChange: (nextMode: "compact" | "detailed") => void;
  showViewModeToggle?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <HistoryControlPanel className={cn("space-y-1.5", className)}>
      {(label || caption || showViewModeToggle) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {(label || caption) ? (
            <div className="min-w-0">
              {label ? <p className="text-sm font-semibold text-slate-100">{label}</p> : null}
              {caption ? <p className="mt-0.25 text-[10px] leading-[1.3] text-[rgb(var(--text-muted)/0.9)]">{caption}</p> : null}
            </div>
          ) : null}
          {showViewModeToggle ? (
            <div className="min-w-[12rem] flex-1 sm:flex-none">
              <SegmentedControl
                options={[
                  { label: "Compact", value: "compact" },
                  { label: "Detailed", value: "detailed" },
                ]}
                value={viewMode}
                size="sm"
                activeIntent="info"
                ariaLabel="History view mode"
                onChange={(nextValue) => onViewModeChange(nextValue as "compact" | "detailed")}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </HistoryControlPanel>
  );
}

export function HistoryTabs({ value, sessionsHref, exercisesHref }: { value: "sessions" | "exercises"; sessionsHref: string; exercisesHref: string }) {
  return (
    <SegmentedControl
      options={[
        { label: "Sessions", value: "sessions", href: sessionsHref },
        { label: "Exercises", value: "exercises", href: exercisesHref },
      ]}
      value={value}
      size="sm"
      activeIntent="info"
      ariaLabel="History tabs"
    />
  );
}

export function HistoryControlGroup({ label, children, summary }: { label: string; children: ReactNode; summary?: string }) {
  return (
    <div className="space-y-2 rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.54)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.56)]">{label}</p>
        {summary ? <SubtitleText className="text-xs">{summary}</SubtitleText> : null}
      </div>
      {children}
    </div>
  );
}

export function HistoryMetaRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap gap-1.5", className)}>{children}</div>;
}

export function HistoryMetaChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
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

export function buildHistorySessionSummaryParts(args: {
  durationSec?: number | null;
  exerciseCount: number;
  setCount: number;
  prLabel?: string | null;
}) {
  return [
    args.durationSec ? formatDurationShort(args.durationSec) : null,
    formatCount(args.exerciseCount, "exercise"),
    formatCount(args.setCount, "set"),
    args.prLabel || null,
  ].filter((part): part is string => Boolean(part));
}

export function buildHistorySessionMeta(args: {
  startedAt: string;
  durationSec?: number | null;
  exerciseCount: number;
  setCount: number;
  prLabel?: string | null;
  dayTitle?: string | null;
}) {
  const dateLine = args.dayTitle ? `${args.dayTitle} • ${formatDateShort(args.startedAt)}` : formatDateShort(args.startedAt);
  return {
    dateLine,
    summaryLine: buildHistorySessionSummaryParts(args).join(" • "),
  };
}
