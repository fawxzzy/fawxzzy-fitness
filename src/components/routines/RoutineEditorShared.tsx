import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BottomActionStackedPrimary } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { controlClassName } from "@/components/ui/formClasses";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function RoutineEditorPageHeader({
  eyebrow,
  title,
  subtitle,
  subtitleRight,
  action,
  actionClassName,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  actionClassName?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-4", className)}>
      <AppHeader
        eyebrow={eyebrow}
        title={title}
        subtitleLeft={subtitle}
        subtitleRight={subtitleRight}
        action={action}
        actionClassName={actionClassName}
      />
      {children ? <div className="space-y-3 border-t border-white/8 pt-3">{children}</div> : null}
    </AppPanel>
  );
}

export function RoutineEditorSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-4", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.58)]">{title}</p>
        {description ? <SubtitleText>{description}</SubtitleText> : null}
      </div>
      {children}
    </AppPanel>
  );
}

export function RoutineEditorTitleInput({
  name,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  name: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <input
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={cn(controlClassName, "min-h-11 border-border/55 bg-[rgb(var(--bg)/0.44)] text-base font-semibold", className)}
    />
  );
}

export function RoutineEditorFullRowToggle({
  label,
  description,
  enabledLabel = "On",
  disabledLabel = "Off",
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabledLabel?: string;
  disabledLabel?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[1.1rem] border px-3 py-2.5 text-left transition",
        enabled
          ? "border-emerald-400/35 bg-emerald-400/14 text-emerald-100"
          : "border-white/8 bg-white/[0.04] text-text hover:bg-white/[0.06]",
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("text-xs font-semibold uppercase tracking-[0.14em]", enabled ? "text-emerald-200" : "text-muted")}>{label}</span>
        <span className={cn("text-sm", enabled ? "text-emerald-100/90" : "text-muted")}>{description}</span>
      </span>
      <span className={cn("text-sm", enabled ? "font-semibold text-emerald-100" : "font-medium text-text")}>{enabled ? enabledLabel : disabledLabel}</span>
    </button>
  );
}

export function RoutineEditorModeToggleRow({
  summary,
  action,
  actions,
  className,
}: {
  summary: ReactNode;
  action?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/35 bg-[rgb(var(--surface-2-soft)/0.3)] px-3 py-2.5", className)}>
      <SubtitleText className="text-xs">{summary}</SubtitleText>
      <div className="flex items-center gap-2">
        {actions ?? action}
      </div>
    </div>
  );
}

export function RoutineEditorDayRow({
  title,
  subtitle,
  badgeText,
  state = "default",
  href,
  rightLabel,
  className,
}: {
  title: string;
  subtitle?: string;
  badgeText?: string;
  state?: ComponentProps<typeof ExerciseCard>["state"];
  href?: string;
  rightLabel?: ReactNode;
  className?: string;
}) {
  const card = (
    <ExerciseCard
      title={title}
      subtitle={subtitle}
      badgeText={badgeText}
      state={state}
      variant="interactive"
      rightIcon={rightLabel ?? <span aria-hidden="true" className="text-muted">›</span>}
      className={cn("items-center", className)}
    />
  );

  if (!href) return card;
  return <Link href={href} className="block">{card}</Link>;
}

export function RoutineEditorStickyActions({
  primary,
  cancelHref,
  secondary,
}: {
  primary: ReactNode;
  cancelHref: string;
  secondary?: ReactNode;
}) {
  return (
    <PublishBottomActions>
      <BottomActionStackedPrimary
        utility={(
          <>
            <Link href={cancelHref} className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}>
              Cancel
            </Link>
            {secondary ?? <div aria-hidden="true" />}
          </>
        )}
        primary={<div className="space-y-2">{primary}</div>}
      />
    </PublishBottomActions>
  );
}
