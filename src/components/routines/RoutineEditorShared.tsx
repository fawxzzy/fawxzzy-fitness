import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { BottomActionSplit, BottomActionStackedPrimary } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomDockLink } from "@/components/layout/BottomDockButton";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppButton } from "@/components/ui/AppButton";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ScreenContractName } from "@/components/ui/app/screenContract";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { RoutineDetailsScreenShellClient } from "@/components/routines/RoutineDetailsExitGuard";

export type EditorExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

export function RoutineEditorPageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  subtitleRight,
  action,
  actionClassName,
  children,
  className,
  recipe = "editDay",
  align = "left",
  withPanel = true,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  actionClassName?: string;
  children?: ReactNode;
  className?: string;
  recipe?: ScreenContractName;
  align?: "left" | "center";
  withPanel?: boolean;
}) {
  return (
    <SharedScreenHeader
      recipe={recipe}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      meta={meta}
      subtitleRight={subtitleRight}
      action={action}
      align={align}
      className={className}
      actionClassName={actionClassName}
      withPanel={withPanel}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function RoutineDetailsScreenShell({
  children,
  backHref,
  title = "Routine Details",
  subtitle,
  align = "left",
}: {
  children: ReactNode;
  backHref: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <RoutineDetailsScreenShellClient backHref={backHref} title={title} subtitle={subtitle} align={align}>
      {children}
    </RoutineDetailsScreenShellClient>
  );
}

export function RoutineEditorSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SharedSectionShell
      recipe="editDay"
      label={title}
      context={description}
      action={action}
      className={cn(appTokens.routineEditorSectionStack, className)}
      bodyClassName={appTokens.routineEditorSectionStack}
    >
      {children}
    </SharedSectionShell>
  );
}

export function RoutineEditorPageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(appTokens.routineEditorPageBody, className)}>{children}</div>;
}

export function RoutineDetailsBottomActionDock({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  // Shared canonical split dock rhythm for Routine Details routes.
  return (
    <BottomActionSplit secondary={secondary} primary={primary} className={className} />
  );
}

export function RoutineDetailsBottomActionPublisher({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  return (
    <PublishBottomActions>
      <RoutineDetailsBottomActionDock primary={primary} secondary={secondary} className={className} />
    </PublishBottomActions>
  );
}

export function RoutineEditorTitleInput({
  name,
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxLength,
  className,
  label = "Routine Title",
  hideLabel = false,
  plainShell = false,
  invalid = false,
}: {
  name: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  ariaLabel: string;
  maxLength?: number;
  className?: string;
  label?: string;
  hideLabel?: boolean;
  plainShell?: boolean;
  invalid?: boolean;
}) {
  const titleLength = Math.max((value.trim() || placeholder).length, label.length);
  const inputWidth = `${Math.min(Math.max(titleLength + 2, 14), 32)}ch`;
  const accentBarClassName = invalid
    ? "bg-[linear-gradient(90deg,rgb(var(--danger-rgb)/0.18),rgb(var(--danger-rgb)/0.9),rgb(var(--danger-rgb)/0.18))] shadow-[0_0_14px_rgb(var(--danger-rgb)/0.22)]"
    : undefined;

  return (
    <div data-app-header-raw-title="true" className="mx-auto block w-fit max-w-full">
      <LabeledEditorField
        label={label}
        className={cn(
          "mx-auto inline-block !w-fit min-w-[10rem] max-w-[min(26rem,calc(100vw-7rem))] align-middle normal-case tracking-normal",
          hideLabel ? "[&_legend]:hidden" : "",
          plainShell ? "!bg-transparent !shadow-none" : "",
          plainShell ? "!rounded-none !border-transparent !shadow-none" : "",
          invalid && !plainShell ? "!border-[rgb(var(--danger-rgb)/0.72)]" : "",
          className,
        )}
        labelClassName={hideLabel ? "sr-only" : undefined}
      >
        <div className="flex min-w-0 flex-col items-center gap-1">
          <input
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            maxLength={maxLength}
            className={cn(
              labeledEditorFieldControlClassName,
              "h-10 max-w-[calc(100vw-8rem)] px-[10px] py-0.5 text-center text-base font-semibold leading-none tracking-normal",
            )}
            style={{ width: inputWidth }}
          />
          <MetricAccentBar variant="thin" className={cn("w-full max-w-full self-stretch", accentBarClassName)} />
        </div>
      </LabeledEditorField>
    </div>
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
        appTokens.routineEditorToggleRow,
        enabled ? appTokens.routineEditorToggleRowEnabled : appTokens.routineEditorToggleRowDefault,
      )}
    >
      <span className={cn(appTokens.routineEditorModeActions, "min-w-0")}>
        <span className={cn(appTokens.routineEditorToggleLabel, enabled ? appTokens.accentText : appTokens.metaText)}>{label}</span>
        {description ? <span className={cn(appTokens.routineEditorToggleDescription, enabled ? "text-[rgb(var(--text-primary)/0.92)]" : appTokens.metaText)}>{description}</span> : null}
      </span>
      <span className={cn(appTokens.routineEditorToggleValue, enabled ? "font-semibold text-[rgb(var(--text-primary)/0.98)]" : "font-medium text-[rgb(var(--text-primary)/0.96)]")}>{enabled ? enabledLabel : disabledLabel}</span>
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
    <div className={cn(appTokens.routineEditorModeRow, className)}>
      <SubtitleText className={appTokens.routineEditorModeSummary}>{summary}</SubtitleText>
      <div className={appTokens.routineEditorModeActions}>
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
        <div className={appTokens.routineEditorModeToggleSlot}>
          <SegmentedControl
            options={actions.map((action) => ({
              label: action.label,
              value: action.label,
            }))}
            value={actions.find((action) => action.active)?.label ?? actions[0]?.label ?? ""}
            size="sm"
            activeIntent="positive"
            ariaLabel="Routine editor list mode"
            onChange={(nextValue) => actions.find((action) => action.label === nextValue)?.onClick()}
          />
        </div>
      )}
    />
  );
}

export function RoutineEditorAddExerciseFlowShell({
  exercises,
  initialSelectedId,
  initialCustomExerciseDraft,
  selectionSearchParam,
  weightUnit,
  exerciseStats,
  onSelectedExerciseChange,
  onApplyLastSelection,
  onClearLastSelection,
  renderFooter,
  goalExtraContent,
  goalBetweenInputsAndPreviewContent,
  goalDockViewportMode,
  goalCompanionToggleCards,
  goalLowerCompanionToggleCards,
  goalAuxiliaryFields,
  goalInlineFailureToggle,
  footerSlot,
  name = "exerciseId",
  customExerciseEnabled = false,
}: {
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  initialCustomExerciseDraft?: ComponentProps<typeof ExercisePicker>["initialCustomExerciseDraft"];
  selectionSearchParam?: ComponentProps<typeof ExercisePicker>["selectionSearchParam"];
  weightUnit?: "lbs" | "kg";
  exerciseStats?: ExerciseStatsOption[];
  onSelectedExerciseChange?: ComponentProps<typeof ExercisePicker>["onSelectedExerciseChange"];
  onApplyLastSelection?: ComponentProps<typeof ExercisePicker>["onApplyLastSelection"];
  onClearLastSelection?: ComponentProps<typeof ExercisePicker>["onClearLastSelection"];
  renderFooter?: ComponentProps<typeof ExercisePicker>["renderFooter"];
  goalExtraContent?: ComponentProps<typeof ExercisePicker>["goalExtraContent"];
  goalBetweenInputsAndPreviewContent?: ComponentProps<typeof ExercisePicker>["goalBetweenInputsAndPreviewContent"];
  goalDockViewportMode?: ComponentProps<typeof ExercisePicker>["goalDockViewportMode"];
  goalCompanionToggleCards?: ComponentProps<typeof ExercisePicker>["goalCompanionToggleCards"];
  goalLowerCompanionToggleCards?: ComponentProps<typeof ExercisePicker>["goalLowerCompanionToggleCards"];
  goalAuxiliaryFields?: ComponentProps<typeof ExercisePicker>["goalAuxiliaryFields"];
  goalInlineFailureToggle?: ComponentProps<typeof ExercisePicker>["goalInlineFailureToggle"];
  footerSlot?: ReactNode;
  name?: string;
  customExerciseEnabled?: boolean;
}) {
  return (
    <ExercisePicker
      exercises={exercises}
      name={name}
      initialSelectedId={initialSelectedId}
      initialCustomExerciseDraft={initialCustomExerciseDraft}
      selectionSearchParam={selectionSearchParam}
      onSelectedExerciseChange={onSelectedExerciseChange}
      onApplyLastSelection={onApplyLastSelection}
      onClearLastSelection={onClearLastSelection}
      routineTargetConfig={weightUnit ? { weightUnit } : undefined}
      exerciseStats={exerciseStats}
      renderFooter={renderFooter}
      goalExtraContent={goalExtraContent}
      goalBetweenInputsAndPreviewContent={goalBetweenInputsAndPreviewContent}
      goalDockViewportMode={goalDockViewportMode}
      goalCompanionToggleCards={goalCompanionToggleCards}
      goalLowerCompanionToggleCards={goalLowerCompanionToggleCards}
      goalAuxiliaryFields={goalAuxiliaryFields}
      goalInlineFailureToggle={goalInlineFailureToggle}
      footerSlot={footerSlot}
      customExerciseEnabled={customExerciseEnabled}
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
    <section className={cn(appTokens.routineEditorInlineSection, className)}>
      <div className={appTokens.routineEditorInlineHeaderRow}>
        <div className={appTokens.routineEditorInlineHeaderStack}>
          <p className={appTokens.routineEditorInlineTitle}>{title}</p>
          {description ? <p className={appTokens.routineEditorInlineDescription}>{description}</p> : null}
        </div>
        {badge ? <span className={cn(appTokens.routineEditorInlineBadge, appTokens.routineEditorInlineBadgeText)}>{badge}</span> : null}
      </div>
      {children}
    </section>
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
      rightIcon={rightLabel ?? <span aria-hidden="true" className={appTokens.metaText}>›</span>}
      className={cn(appTokens.routineEditorDayRow, className)}
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
            <BottomDockLink href={cancelHref} intent="info">
              Cancel
            </BottomDockLink>
            {secondary ?? <div aria-hidden="true" />}
          </>
        )}
        primary={<div className={appTokens.routineEditorStickyPrimaryStack}>{primary}</div>}
      />
    </PublishBottomActions>
  );
}

