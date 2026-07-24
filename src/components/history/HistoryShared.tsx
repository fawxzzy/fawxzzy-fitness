import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/BackButton";
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
  withPanel = true,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  withPanel?: boolean;
}) {
  return (
    <SharedScreenHeader
      recipe="historyDetail"
      title={title}
      subtitle={subtitle}
      className="px-1"
      align="center"
      withPanel={withPanel}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function HistoryDetailHeader({
  title,
  titleClassName,
  subtitle,
  eyebrow = "History",
  meta,
  action,
  children,
  className,
  actionClassName,
  align = "left",
}: {
  title: ReactNode;
  titleClassName?: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
  align?: "left" | "center";
}) {
  return (
    <SharedScreenHeader
      recipe="historyDetail"
      eyebrow={eyebrow}
      title={title}
      titleClassName={titleClassName}
      subtitle={subtitle}
      action={action}
      meta={meta}
      align={align}
      className={cn("pl-1", className)}
      actionClassName={actionClassName}
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
  headerAlign = "left",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAlign?: "left" | "center";
}) {
  return (
    <SharedSectionShell
      recipe="historyDetail"
      label={<span className={appTokens.historySectionTitle}>{title}</span>}
      context={description ? <span className={appTokens.historySectionDescription}>{description}</span> : undefined}
      action={action}
      className={cn("pl-1", appTokens.historySectionPanel, className)}
      headerClassName={headerAlign === "center" ? "justify-center" : undefined}
      headerContentClassName={headerAlign === "center" ? "w-full text-center" : undefined}
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
  backHref,
  backLabel = "Back",
}: {
  title: string;
  caption: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <AppPanel className={appTokens.historyRouteMessage}>
      <p className={appTokens.historyRouteMessageTitle}>{title}</p>
      <p className={appTokens.historyRouteMessageCaption}>{caption}</p>
      {backHref ? (
        <div className="pt-3">
          <BackButton
            href={backHref}
            label={backLabel}
            ariaLabel={backLabel}
            historyBehavior="fallback-only"
          />
        </div>
      ) : null}
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
  const hasChrome = Boolean(label || caption || showViewModeToggle);

  if (!hasChrome) {
    return children ? <div className={className}>{children}</div> : null;
  }

  return (
    <HistoryControlPanel className={cn(appTokens.historyTitleControlStack, className)}>
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
              activeIntent="toggleActive"
              inactiveIntent="toggleInactive"
              ariaLabel="History view mode"
              onChange={(nextValue) => onViewModeChange(nextValue as "compact" | "detailed")}
            />
          </div>
        ) : null}
      </div>
      {children}
    </HistoryControlPanel>
  );
}

export function HistoryTabs({
  value,
  sessionsHref,
  exercisesHref,
  progressionHref,
}: {
  value: "sessions" | "exercises" | "progression";
  sessionsHref: string;
  exercisesHref: string;
  progressionHref: string;
}) {
  return (
    <SegmentedControl
      options={[
        { label: "Sessions", value: "sessions", href: sessionsHref },
        { label: "Exercises", value: "exercises", href: exercisesHref },
        { label: "Progression", value: "progression", href: progressionHref },
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
