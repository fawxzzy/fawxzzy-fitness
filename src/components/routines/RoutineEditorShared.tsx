import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { BottomActionStackedPrimary } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";
import { Glass } from "@/components/ui/Glass";
import { GlassButton } from "@/components/ui/GlassButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { controlClassName } from "@/components/ui/formClasses";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export type EditorExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
};

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
    <AppPanel className={cn(standaloneHeaderFamily.panelClassName, className)}>
      <AppHeader
        eyebrow={eyebrow}
        title={title}
        subtitleLeft={subtitle}
        subtitleRight={subtitleRight}
        action={action}
        className={standaloneHeaderFamily.headerClassName}
        actionClassName={cn(standaloneHeaderFamily.actionClassName, actionClassName)}
        titleClassName={standaloneHeaderFamily.titleClassName}
      />
      {children ? <div className={standaloneHeaderFamily.dividerClassName}>{children}</div> : null}
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
  description?: string;
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
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn("truncate text-xs font-semibold uppercase tracking-[0.14em]", enabled ? "text-emerald-200" : "text-muted")}>{label}</span>
        {description ? <span className={cn("text-sm", enabled ? "text-emerald-100/90" : "text-muted")}>{description}</span> : null}
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

export function RoutineEditorListModeControlRow({
  summary,
  actions,
  className,
}: {
  summary: ReactNode;
  actions: Array<{
    label: string;
    onClick: () => void;
    active?: boolean;
  }>;
  className?: string;
}) {
  return (
    <RoutineEditorModeToggleRow
      summary={summary}
      className={className}
      actions={(
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <AppButton
              key={action.label}
              type="button"
              variant={action.active ? "secondary" : "ghost"}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </AppButton>
          ))}
        </div>
      )}
    />
  );
}

export function RoutineEditorAddExerciseFlowShell({
  exercises,
  initialSelectedId,
  weightUnit,
  exerciseStats,
  onSelectedExerciseChange,
  renderFooter,
  footerSlot,
  name = "exerciseId",
}: {
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit?: "lbs" | "kg";
  exerciseStats?: ExerciseStatsOption[];
  onSelectedExerciseChange?: ComponentProps<typeof ExercisePicker>["onSelectedExerciseChange"];
  renderFooter?: ComponentProps<typeof ExercisePicker>["renderFooter"];
  footerSlot?: ReactNode;
  name?: string;
}) {
  return (
    <ExercisePicker
      exercises={exercises}
      name={name}
      initialSelectedId={initialSelectedId}
      onSelectedExerciseChange={onSelectedExerciseChange}
      routineTargetConfig={weightUnit ? { weightUnit } : undefined}
      exerciseStats={exerciseStats}
      renderFooter={renderFooter}
      footerSlot={footerSlot}
    />
  );
}


export function RoutineEditorInlineSection({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.58)] p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
        {badge ? <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted">{badge}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function RoutineEditorSaveDiscardConfirmSheet({
  open,
  title = "Discard changes?",
  description,
  stayLabel = "Stay",
  discardLabel = "Discard",
  onStay,
  onDiscard,
}: {
  open: boolean;
  title?: string;
  description: ReactNode;
  stayLabel?: string;
  discardLabel?: string;
  onStay: () => void;
  onDiscard: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Glass variant="overlay" className="w-full max-w-sm p-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)]" interactive={false}>
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
          <div className="flex justify-end gap-2">
            <GlassButton className="min-w-20" onClick={onStay}>
              {stayLabel}
            </GlassButton>
            <GlassButton
              className="min-w-20 border-red-300/70 bg-red-500/30 text-white hover:bg-red-500/45"
              onClick={onDiscard}
            >
              {discardLabel}
            </GlassButton>
          </div>
        </div>
      </Glass>
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
