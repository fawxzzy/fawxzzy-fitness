import type { ReactNode } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { SubtitleText } from "@/components/ui/text-roles";
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
      className="pl-1"
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
      className={cn("pl-1", className)}
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
      label={<span className={appTokens.historySectionTitle}>{title}</span>}
      context={description ? <span className={appTokens.historySectionDescription}>{description}</span> : undefined}
      action={action}
      className={cn("pl-1", appTokens.historySectionPanel, className)}
      bodyClassName={appTokens.historySectionBody}
    >
      {children}
    </SharedSectionShell>
  );
}

export function HistoryControlPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <SharedSectionShell
      recipe="historyDetail"
      className={cn("pl-1", appTokens.historyControlPanel, className)}
      bodyClassName={appTokens.historyControlPanelBody}
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
    <AppPanel className={appTokens.historyRouteMessage}>
      <p className={appTokens.historyRouteMessageTitle}>{title}</p>
      <p className={appTokens.historyRouteMessageCaption}>{caption}</p>
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
    <HistoryControlPanel className={cn(appTokens.historyTitleControlStack, className)}>
      {(label || caption || showViewModeToggle) ? (
        <div className={appTokens.historyTitleControlRow}>
          {(label || caption) ? (
            <div className="min-w-0">
              {label ? <p className={appTokens.historyTitleControlLabel}>{label}</p> : null}
              {caption ? <p className={appTokens.historyTitleControlCaption}>{caption}</p> : null}
            </div>
          ) : null}
          {showViewModeToggle ? (
            <div className={appTokens.historyTitleControlToggleSlot}>
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
    <div className={appTokens.historyControlGroup}>
      <div className={appTokens.historyControlGroupHeader}>
        <p className={appTokens.historySectionTitle}>{label}</p>
        {summary ? <SubtitleText className={appTokens.historyControlGroupSummary}>{summary}</SubtitleText> : null}
      </div>
      {children}
    </div>
  );
}

export function HistoryMetaRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appTokens.detailMetaRow, className)}>{children}</div>;
}

export function HistoryMetaChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <AppBadge
      tone={emphasized ? "success" : "default"}
      className={cn(appTokens.detailMetaChip, emphasized ? appTokens.detailMetaChipEmphasized : appTokens.detailMetaChipDefault)}
    >
      <span className={appTokens.detailMetaChipLabel}>{label}</span>
      <span className={appTokens.detailMetaChipValue}>{value}</span>
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
