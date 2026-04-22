import type { ReactNode } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { SubtitleText } from "@/components/ui/text-roles";
import { formatCount, formatDateShort, formatDurationShort } from "@/lib/formatting";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";

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
    <SharedSectionShell
      recipe="historyDetail"
      label={<span className="text-base font-semibold text-text">{title}</span>}
      context={description ? <span className="text-sm">{description}</span> : undefined}
      action={action}
      className={cn("space-y-4", className)}
      bodyClassName="space-y-4"
    >
      {children}
    </SharedSectionShell>
  );
}

export function HistoryControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <SharedSectionShell
      recipe="historyDetail"
      className={cn("space-y-2", className)}
      bodyClassName="space-y-2 max-md:space-y-1.5"
    >
      {children}
    </SharedSectionShell>
  );
}

export function HistoryRouteErrorShell({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <AppPanel className="space-y-2 p-4">
      <p className="text-base font-semibold text-[rgb(var(--text)/0.98)]">{title}</p>
      <p className="text-sm leading-6 text-[rgb(var(--text)/0.72)]">{caption}</p>
    </AppPanel>
  );
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
              {label ? <p className="text-sm font-semibold text-text">{label}</p> : null}
              {caption ? <p className="mt-0.5 text-xs leading-[1.3] text-muted">{caption}</p> : null}
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
    <div className="rounded-[1.15rem] border border-border/35 bg-[rgb(var(--surface-2-soft)/0.65)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <p className={fitnessDesignPrimitiveClassNames.sectionLayout.sectionLabelClassName}>{label}</p>
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
    <AppBadge tone={emphasized ? "success" : "default"} className={cn("gap-1.5 px-2.5 py-1 normal-case tracking-normal")}>
      <span className="text-muted">{label}</span>
      <span className="text-text">{value}</span>
    </AppBadge>
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
