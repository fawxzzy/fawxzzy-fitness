"use client";

import { memo, type ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { AppButton } from "@/components/ui/AppButton";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { type ExerciseOption, type ExerciseRowProps, type ExerciseRowCueClasses } from "./types";
import { normalizeTagValue } from "./filter";

export const pickerRowMobileDensityClassNames = {
  body: "max-md:gap-1",
  title: "max-md:text-[0.86rem] max-md:leading-[1.15]",
  titleContainer: "max-md:space-y-0.25 max-md:pb-[1.9rem]",
  subtitle: "max-md:text-[length:var(--type-caption)] max-md:leading-[1.26]",
  content: "max-md:space-y-0.25",
  trailing: "max-md:min-w-[4.3rem]",
  selectPill: "max-md:min-h-11 max-md:min-w-[3rem] max-md:px-1.75 max-md:text-[length:var(--type-caption)]",
} as const;

export const thinPickerRowClassName = "appearance-none [box-shadow:none] flex w-full items-center justify-between gap-3 overflow-hidden rounded-none rounded-r-[var(--card-radius)] border-0 bg-[rgb(var(--surface-1-rgb)/0.86)] px-4 py-2.5 text-left shadow-none outline-none ring-0 transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";

export const thinPickerRowUnselectedBorderClassName = "!border !border-[rgb(var(--accent-yellow-on)/0.72)] shadow-[inset_0_0_0_1px_rgb(var(--accent-yellow-on)/0.72)]";

function ExerciseMetaLine({
  items,
  emphasizeLead = false,
  className,
  leadClassName,
}: {
  items: string[];
  emphasizeLead?: boolean;
  className?: string;
  leadClassName?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SignatureInlineList
      separator="pipe"
      className={cn(
        "min-w-0 max-w-full gap-x-2 gap-y-1.5 text-[length:var(--type-caption)] font-medium leading-[1.15] text-[rgb(var(--text-secondary)/0.9)]",
        className,
      )}
      itemClassName="min-w-0 whitespace-nowrap leading-none"
      items={items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={cn(
            "inline-flex min-w-0 items-center align-middle",
            emphasizeLead && index === 0 ? leadClassName ?? "text-[rgb(var(--accent-strong)/0.98)]" : undefined,
          )}
        >
          {item}
        </span>
      ))}
    />
  );
}

export function ExerciseTitleInline({
  name,
  metadataItems,
  nameClassName,
  metadataClassName,
  emphasizeLeadMetadata = false,
  metadataLeadClassName,
  showUnderline = false,
  underlineClassName,
}: {
  name: string;
  metadataItems: string[];
  nameClassName?: string;
  metadataClassName?: string;
  emphasizeLeadMetadata?: boolean;
  metadataLeadClassName?: string;
  showUnderline?: boolean;
  underlineClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-y-1 align-middle">
      <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
        <span className={cn("min-w-0 max-w-full whitespace-normal break-words leading-[1.18]", nameClassName)}>
          {name}
        </span>
        {showUnderline ? <MetricAccentBar variant="thin" className={cn("w-full opacity-80", underlineClassName)} /> : null}
      </span>
      <ExerciseMetaLine
        items={metadataItems}
        emphasizeLead={emphasizeLeadMetadata}
        className={metadataClassName}
        leadClassName={metadataLeadClassName}
      />
    </span>
  );
}

export function ExerciseTitleWithCompanion({
  name,
  metadataItems,
  companion,
  nameClassName,
  metadataClassName,
  emphasizeLeadMetadata = false,
  metadataLeadClassName,
  showTitleUnderline = false,
  titleUnderlineClassName,
}: {
  name: string;
  metadataItems: string[];
  companion?: ReactNode;
  nameClassName?: string;
  metadataClassName?: string;
  emphasizeLeadMetadata?: boolean;
  metadataLeadClassName?: string;
  showTitleUnderline?: boolean;
  titleUnderlineClassName?: string;
}) {
  return (
    <span data-exercise-title-companion-row="true" className="inline-flex min-w-0 max-w-full flex-wrap items-start gap-x-2.5 gap-y-1.5 align-top">
      <span className="inline-flex min-w-[7rem] max-w-[10.9rem] flex-1 basis-[7rem] flex-col">
        <ExerciseTitleInline
          name={name}
          metadataItems={metadataItems}
          nameClassName={nameClassName}
          metadataClassName={metadataClassName}
          emphasizeLeadMetadata={emphasizeLeadMetadata}
          metadataLeadClassName={metadataLeadClassName}
          showUnderline={showTitleUnderline}
          underlineClassName={titleUnderlineClassName}
        />
      </span>
      {companion ? (
        <span className="inline-flex min-w-0 shrink-0 items-start gap-1.5 pt-[1px]">
          <SignatureMiniPipe className="mt-[1px] h-auto self-stretch" barClassName="h-full" />
          <span className="inline-flex max-w-[6.9rem] min-w-0 flex-col items-start gap-y-1 text-left">
            {companion}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function formatMeasurementStat(weight: number | null, reps: number | null, unit: string | null) {
  if (weight === null || reps === null) {
    return null;
  }

  const weightLabel = Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
  return `${weightLabel}${unit ? ` ${unit}` : ""} × ${reps}`;
}

function formatStatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

void formatMeasurementStat;

export function formatLoggedMeasurementStat(weight: number | null, reps: number | null, unit: string | null) {
  const hasWeight = typeof weight === "number" && Number.isFinite(weight) && weight > 0;
  const hasReps = typeof reps === "number" && Number.isFinite(reps) && reps > 0;

  if (!hasWeight && !hasReps) {
    return null;
  }

  const weightLabel = hasWeight
    ? `${Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "")}${unit ? ` ${unit}` : ""}`
    : null;

  if (weightLabel && hasReps) {
    return `${weightLabel} x ${reps}`;
  }

  if (weightLabel) {
    return weightLabel;
  }

  return `${reps} reps`;
}

function formatCompactMetricNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatConfiguredDurationSummary(durationSeconds: number | null) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  if (durationSeconds < 60) {
    return `${durationSeconds} sec`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}m ${seconds}s`;
}

export function hasConfiguredSetupSnapshot(stats: ExerciseStatsOption | undefined) {
  if (!stats) return false;
  return Boolean(
    stats.lastConfiguredTargetSets != null
    || stats.lastConfiguredTargetRepsMin != null
    || stats.lastConfiguredTargetRepsMax != null
    || stats.lastConfiguredTargetWeight != null
    || stats.lastConfiguredTargetDurationSeconds != null
    || stats.lastConfiguredTargetDistance != null
    || stats.lastConfiguredTargetCalories != null
    || stats.lastConfiguredAt
    || stats.lastProgressionPlaybookId
    || stats.lastProgressionPlaybookConfig,
  );
}

function buildConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  if (!stats) {
    return [];
  }

  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const weightValue = stats.lastConfiguredTargetWeight;
  const weightLabel = typeof weightValue === "number" && Number.isFinite(weightValue) && weightValue >= 0
    ? `${formatCompactMetricNumber(weightValue)}${stats.lastConfiguredTargetWeightUnit ? ` ${stats.lastConfiguredTargetWeightUnit}` : ""}`
    : null;

  const repsMin = stats.lastConfiguredTargetRepsMin;
  const repsMax = stats.lastConfiguredTargetRepsMax;
  const repCountLabel = !hasFailureTarget && typeof repsMin === "number" && Number.isFinite(repsMin) && repsMin > 0
    ? (
      typeof repsMax === "number" && Number.isFinite(repsMax) && repsMax > 0 && repsMax !== repsMin
        ? `${repsMin}-${repsMax}`
        : `${repsMin}`
    )
    : null;

  const parts: string[] = [];
  if (weightLabel) {
    parts.push(weightLabel);
  }

  if (repCountLabel) {
    parts.push(`${repCountLabel} reps`);
  } else if (hasFailureTarget) {
    parts.push("till failure");
  }

  const durationLabel = formatConfiguredDurationSummary(stats.lastConfiguredTargetDurationSeconds);
  if (durationLabel) {
    parts.push(durationLabel);
  }

  if (typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance) && stats.lastConfiguredTargetDistance > 0) {
    parts.push(
      `${formatCompactMetricNumber(stats.lastConfiguredTargetDistance)}${stats.lastConfiguredTargetDistanceUnit ? ` ${stats.lastConfiguredTargetDistanceUnit}` : ""}`,
    );
  }

  if (typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories) && stats.lastConfiguredTargetCalories > 0) {
    parts.push(`${formatCompactMetricNumber(stats.lastConfiguredTargetCalories)} cal`);
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

function getConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  const summary = formatConfiguredMeasurementStat(stats);
  return summary
    ? summary
      .split(" â€¢ ")
      .map((part) => part.trim())
      .filter(Boolean)
    : [];
}

export function collectConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  if (!stats) {
    return [] as string[];
  }

  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const weightValue = stats.lastConfiguredTargetWeight;
  const weightLabel = typeof weightValue === "number" && Number.isFinite(weightValue) && weightValue >= 0
    ? `${formatCompactMetricNumber(weightValue)}${stats.lastConfiguredTargetWeightUnit ? ` ${stats.lastConfiguredTargetWeightUnit}` : ""}`
    : null;

  const repsMin = stats.lastConfiguredTargetRepsMin;
  const repsMax = stats.lastConfiguredTargetRepsMax;
  const repCountLabel = !hasFailureTarget && typeof repsMin === "number" && Number.isFinite(repsMin) && repsMin > 0
    ? (
      typeof repsMax === "number" && Number.isFinite(repsMax) && repsMax > 0 && repsMax !== repsMin
        ? `${repsMin}-${repsMax}`
        : `${repsMin}`
    )
    : null;

  const parts: string[] = [];
  if (weightLabel) {
    parts.push(weightLabel);
  }

  if (repCountLabel) {
    parts.push(`${repCountLabel} reps`);
  } else if (hasFailureTarget) {
    parts.push("till failure");
  }

  const durationLabel = formatConfiguredDurationSummary(stats.lastConfiguredTargetDurationSeconds);
  if (durationLabel) {
    parts.push(durationLabel);
  }

  if (typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance) && stats.lastConfiguredTargetDistance > 0) {
    parts.push(
      `${formatCompactMetricNumber(stats.lastConfiguredTargetDistance)}${stats.lastConfiguredTargetDistanceUnit ? ` ${stats.lastConfiguredTargetDistanceUnit}` : ""}`,
    );
  }

  if (typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories) && stats.lastConfiguredTargetCalories > 0) {
    parts.push(`${formatCompactMetricNumber(stats.lastConfiguredTargetCalories)} cal`);
  }

  return parts;
}

function formatConfiguredMeasurementStat(stats: ExerciseStatsOption | undefined) {
  const parts = collectConfiguredMeasurementSummaryParts(stats);
  return parts.length > 0 ? parts.join(" • ") : null;
}

export function hasExerciseStatsSignal(stats: ExerciseStatsOption | undefined) {
  if (!stats) return false;
  return Boolean(
    stats.lastWeight != null
    || stats.lastReps != null
    || stats.lastPerformedAt
    || hasConfiguredSetupSnapshot(stats)
    || stats.prWeight != null
    || stats.prReps != null
    || stats.prEst1rm != null
    || stats.actualPrWeight != null
    || stats.actualPrReps != null
    || stats.actualPrAt,
  );
}

export function resolveExerciseRowCueClasses(exercise: ExerciseOption): ExerciseRowCueClasses {
  const equipment = normalizeTagValue(exercise.equipment);
  const movementPattern = normalizeTagValue(exercise.movement_pattern);
  const isCardioLike = exercise.measurement_type === "time"
    || exercise.measurement_type === "distance"
    || exercise.measurement_type === "time_distance"
    || equipment.includes("bike")
    || equipment.includes("treadmill")
    || equipment.includes("rower")
    || movementPattern.includes("gait");
  const isBodyweightLike = equipment.includes("bodyweight")
    || equipment.includes("pull up")
    || equipment.includes("pull-up")
    || movementPattern.includes("brace")
    || movementPattern.includes("mobility")
    || exercise.measurement_type === "none";

  if (isCardioLike) {
    return {
      leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
      unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
      selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.18),rgb(var(--selection-rgb)/0.08))]",
      selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
      dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.2),rgb(var(--accent-yellow-on)/1),rgb(var(--accent)/0.28))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]",
      dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent-yellow-on)/0.08)]",
    };
  }

  if (isBodyweightLike) {
    return {
      leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
      unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
      selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.16),rgb(var(--selection-rgb)/0.08))]",
      selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
      dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.16),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent)/0.24))] shadow-[0_0_14px_rgb(var(--accent-divider-rgb)/0.2)]",
      dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent-divider-rgb)/0.08)]",
    };
  }

  return {
    leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
    unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
    selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent)/0.18),rgb(var(--selection-rgb)/0.08))]",
    selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
    dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent)/0.18),rgb(var(--accent)/1),rgb(var(--accent-divider-rgb)/0.24))] shadow-[0_0_14px_rgb(var(--accent)/0.22)]",
    dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent)/0.08)]",
  };
}

export const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, hasStats, metadataItems, selectedSummaryText, onOpenInfo, onPress }: ExerciseRowProps) {
  const rowCue = resolveExerciseRowCueClasses(exercise);

  if (!isSelected) {
    return (
      <li>
        <button
          type="button"
          className={cn(
            thinPickerRowClassName,
            thinPickerRowUnselectedBorderClassName,
            "group relative min-h-[4.15rem] rounded-r-[calc(var(--card-radius)+2px)] pl-3 pr-3.5",
            hasStats ? "bg-[rgb(var(--accent-yellow-on)/0.08)]" : "bg-[rgb(var(--surface-1-rgb)/0.84)]",
            "hover:border-[rgb(var(--accent-yellow-on)/0.9)] hover:bg-[rgb(var(--surface-2-rgb)/0.92)] focus-visible:border-[rgb(var(--accent)/0.64)] focus-visible:bg-[rgb(var(--surface-2-rgb)/0.96)]",
          )}
          onClick={() => onPress(exercise.id, isSelected)}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full transition-colors",
              rowCue.unselectedRailClassName,
            )}
          />
          <div className="min-w-0 flex-1 pl-2">
            <div className="text-left">
              <ExerciseTitleInline
                name={exercise.name}
                metadataItems={metadataItems}
                nameClassName="text-[0.96rem] font-semibold text-[rgb(var(--text)/0.96)]"
                metadataClassName="text-[length:var(--type-caption)] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.86)]"
                emphasizeLeadMetadata
                metadataLeadClassName={rowCue.leadTextClassName}
              />
            </div>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "flex min-w-[4.7rem] shrink-0 items-center justify-end whitespace-nowrap text-[0.74rem] font-semibold uppercase tracking-[0.14em] leading-none tabular-nums",
              hasStats ? "text-[rgb(var(--accent-strong)/0.96)]" : "text-[rgb(var(--text-muted)/0.92)]",
            )}
          >
            Select
          </span>
        </button>
      </li>
    );
  }

  const rowState = isSelected ? "selected" : "default";
  const visibleMetadataItems = isSelected ? metadataItems.slice(0, 2) : metadataItems;
  const rightRailClassName = isSelected
    ? "border-l-0 bg-transparent"
    : hasStats
      ? "border-l-[rgb(var(--accent-yellow-on)/0.32)] bg-[rgb(var(--accent-yellow-on)/0.08)]"
      : "border-l-[rgb(var(--accent-yellow-on)/0.32)] bg-[rgb(var(--surface-1-rgb)/0.28)]";
  const selectedInfoButton = isSelected && onOpenInfo ? (
    <button
      type="button"
      aria-label={`Open exercise info for ${exercise.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpenInfo();
      }}
      className="pointer-events-auto absolute bottom-[0.3rem] right-[0.3rem] z-[3] inline-flex h-[1.625rem] w-[1.625rem] before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--bg-app)/0.84)] text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] shadow-[0_0_10px_rgb(var(--accent)/0.1)] backdrop-blur-[16px] transition-colors hover:border-[rgb(var(--accent)/0.42)] hover:text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]"
    >
      <span aria-hidden="true">i</span>
    </button>
  ) : null;
  const selectedOverlayActions = isSelected
    ? (
      <>
        {selectedInfoButton}
      </>
    )
    : undefined;

  return (
    <li>
      <ExerciseCard
          title={(
            <ExerciseTitleWithCompanion
              name={exercise.name}
              metadataItems={visibleMetadataItems}
              companion={isSelected && selectedSummaryText ? (
                <>
                  <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
                    <span className="min-w-0 max-w-full whitespace-nowrap text-[0.9rem] font-semibold leading-[1.18] text-[rgb(var(--text)/0.92)]">
                      Your Goal
                    </span>
                    <MetricAccentBar variant="thin" className="w-full opacity-75" />
                  </span>
                  <span className="min-w-0 whitespace-nowrap text-[length:var(--type-caption)] tracking-[0.01em] leading-[1.18] text-[rgb(var(--text-secondary)/0.88)]">
                    {selectedSummaryText}
                  </span>
                </>
              ) : undefined}
              nameClassName="text-[0.98rem] font-semibold text-[rgb(var(--text)/0.98)]"
              metadataClassName="!flex-nowrap text-[length:var(--type-caption)] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.9)]"
              emphasizeLeadMetadata
              metadataLeadClassName={rowCue.leadTextClassName}
              showTitleUnderline={isSelected}
              titleUnderlineClassName="opacity-80"
            />
          )}
          subtitle={undefined}
          subtitleLabel={undefined}
          subtitleTone="plain"
        leadingVisual={(
          <ExerciseThumb
            exercise={exercise}
            detailed={false}
            layout="rail"
            railWidth={72}
            sizes="72px"
            intent="row-card"
          />
          )}
          variant="compact"
          state={rowState}
          onPress={() => onPress(exercise.id, isSelected)}
          className={cn(
            "!border-[rgb(var(--accent-divider-rgb)/0.72)]",
            "ring-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]",
            "[box-shadow:none]",
            "bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.14),rgb(var(--surface-1-rgb)/0.98))]",
          )}
          mediaClassName={cn("!border-r-0", rowCue.selectedMediaClassName)}
        rightIcon={isSelected ? null : (
            <span
              aria-hidden="true"
              className={cn(
                "flex h-full min-h-0 min-w-[2.2rem] self-stretch items-center justify-center rounded-none rounded-r-[inherit] border-0 bg-transparent px-1 shadow-none",
                pickerRowMobileDensityClassNames.selectPill,
                isSelected
                  ? "text-[rgb(224_255_248)]"
                : hasStats
                  ? "text-[rgb(var(--text)/0.92)]"
                  : "text-[rgb(var(--text-muted)/0.96)]",
            )}
          >
              {"Select"}
          </span>
        )}
        trailingClassName={cn(
          pickerRowMobileDensityClassNames.trailing,
          isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted",
        )}
          overlayActions={selectedOverlayActions}
          overlayActionsClassName={isSelected ? "inset-0 !right-0 !top-0 !translate-y-0 pointer-events-none" : undefined}
          rightRailClassName={cn(
            "-my-[var(--exercise-row-shell-padding-y-compact)] -mr-[calc(var(--exercise-row-shell-padding-x)+1px)] self-stretch overflow-hidden rounded-r-[inherit] border-l border-l-[rgb(var(--accent)/0.16)]",
            rightRailClassName,
          )}
        trailingStackClassName="h-full min-h-0"
          bodyClassName={cn(pickerRowMobileDensityClassNames.body, "min-h-[4.45rem]")}
          titleClassName={pickerRowMobileDensityClassNames.title}
          titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
          subtitleClassName="pr-8 text-[length:var(--type-caption)] leading-[1.25]"
          subtitleLabelClassName={rowCue.selectedSummaryLabelClassName}
          contentClassName={cn("pl-1.5 pr-9", pickerRowMobileDensityClassNames.content)}
        />
    </li>
    );
});

export function EmptyExerciseRow({ onClearFilters, libraryEmpty = false }: { onClearFilters?: () => void; libraryEmpty?: boolean }) {
  return (
    <li>
      <ExerciseCard
        title={libraryEmpty ? "No exercises yet" : "No exercises match your filters"}
        subtitle={libraryEmpty ? "Use Custom Exercise above to create your first one." : "Clear search or remove a filter to widen the library."}
        variant="compact"
        state="empty"
        leadingVisual={(
          <div className="grid h-full w-full place-items-center text-[rgb(var(--text-muted)/0.72)]" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 10a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
              <path d="m14.5 14.5 4 4" />
              <path d="M4 7h10" />
            </svg>
          </div>
        )}
        rightIcon={<span aria-hidden="true" className="block h-5 w-5 opacity-0" />}
        className="shadow-none"
        bodyClassName={pickerRowMobileDensityClassNames.body}
        titleClassName={pickerRowMobileDensityClassNames.title}
        titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
        subtitleClassName={pickerRowMobileDensityClassNames.subtitle}
        contentClassName={pickerRowMobileDensityClassNames.content}
      />
      {onClearFilters ? (
        <div className="mt-2">
          <AppButton type="button" variant="secondary" size="sm" fullWidth onClick={onClearFilters}>
            Clear search and filters
          </AppButton>
        </div>
      ) : null}
    </li>
  );
}
