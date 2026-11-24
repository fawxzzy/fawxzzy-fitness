"use client";

import { type ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { flattenExerciseCurationTagValues, normalizeExerciseCurationTags } from "@/lib/exercise-curation";
import { type ExerciseOption, type TagFilterGroup } from "./types";

export const tagGroupLabels: Record<TagFilterGroup, string> = {
  primary_muscle: "Primary Muscle",
  secondary_muscle: "Secondary Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

const customExerciseFilterRailCardClassName = cn(
  "inline-flex shrink-0 flex-col overflow-hidden shadow-none",
  appTokens.curatedInfoCard,
  appTokens.curatedInfoCardCompact,
  appTokens.curatedInfoCardDefault,
);

export const customExerciseFilterStageClassName = cn(
  "w-full max-w-full overflow-visible shadow-none",
  appTokens.curatedInfoCard,
  appTokens.curatedInfoCardCompact,
  appTokens.curatedInfoCardDefault,
);

export function ensureSelectedTagsInGroups(groups: ExerciseTagGroup[], selectedTags: string[]) {
  if (selectedTags.length === 0) {
    return groups;
  }

  return groups.map((group) => {
    const existingTagValues = new Set(group.tags.map((tag) => tag.value));
    const missingSelectedTags = selectedTags
      .filter((value) => !existingTagValues.has(value))
      .map((value) => ({
        value,
        label: formatTagLabel(value.replace(/^[^:]+:/, "")),
      }));

    if (missingSelectedTags.length === 0) {
      return group;
    }

    return {
      ...group,
      tags: [...missingSelectedTags, ...group.tags],
    };
  });
}

export function normalizeTagValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function toTagArray(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function normalizeExerciseTags(exercise: ExerciseOption) {
  const candidates = [
    ...toTagArray(exercise.tags),
    ...toTagArray(exercise.tag),
    ...toTagArray(exercise.categories),
    ...toTagArray(exercise.category),
    ...toTagArray(exercise.muscles),
    ...toTagArray(exercise.muscle),
    ...toTagArray(exercise.primary_muscle),
    ...toTagArray(exercise.primary_muscles),
    ...toTagArray(exercise.secondary_muscles),
    ...toTagArray(exercise.movement_pattern),
    ...toTagArray(exercise.equipment),
    ...flattenExerciseCurationTagValues(normalizeExerciseCurationTags(exercise.curation_tags)),
  ];

  const deduped = new Map<string, string>();
  for (const rawTag of candidates) {
    const normalized = rawTag.toLowerCase();
    if (!deduped.has(normalized)) {
      deduped.set(normalized, rawTag);
    }
  }

  return deduped;
}

export function appendTagsWithGroup(
  groupedTags: Map<string, string>,
  rawValues: string[] | string | null | undefined,
) {
  for (const value of toTagArray(rawValues)) {
    const normalized = value.toLowerCase();
    if (!groupedTags.has(normalized)) {
      groupedTags.set(normalized, value);
    }
  }
}

export function buildScopedFilterTagValue(group: TagFilterGroup, value: string) {
  return `${group}:${normalizeTagValue(value)}`;
}

export function appendScopedFilterTags(
  target: Set<string>,
  rawValues: string[] | string | null | undefined,
  group: TagFilterGroup,
) {
  for (const value of toTagArray(rawValues)) {
    target.add(buildScopedFilterTagValue(group, value));
  }
}

export function formatTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function buildSingleSelectTags(nextTags: string[], previousTags: string[]) {
  if (nextTags.length === 0) {
    return [];
  }

  const newlyAdded = nextTags.find((tag) => !previousTags.includes(tag));
  return [newlyAdded ?? nextTags[0]];
}

export function buildCustomExerciseTagGroups(exercises: ExerciseOption[]) {
  const muscles = Array.from(new Set(
    exercises
      .flatMap((exercise) => [
        ...toTagArray(exercise.primary_muscle),
        ...toTagArray(exercise.primary_muscles),
        ...toTagArray(exercise.secondary_muscles),
      ])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  const movements = Array.from(new Set(
    exercises
      .map((exercise) => exercise.movement_pattern?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  const equipment = Array.from(new Set(
    exercises
      .map((exercise) => exercise.equipment?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  return {
    muscleGroups: [{
      key: "primary_muscle",
      label: "Primary Muscle",
      tags: muscles.map((value) => ({ value: `muscle:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    secondaryMuscleGroups: [{
      key: "secondary_muscle",
      label: "Secondary Muscle",
      tags: muscles.map((value) => ({ value: `muscle:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    movementGroups: [{
      key: "movement_pattern",
      label: "Movement",
      tags: movements.map((value) => ({ value: `movement:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    equipmentGroups: [{
      key: "equipment",
      label: "Equipment",
      tags: equipment.map((value) => ({ value: `equipment:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
  };
}

export function CustomExerciseFilterRailCard({
  title,
  isOpen,
  onClick,
  buttonRef,
  widthClassName = "w-[10rem] min-w-[10rem]",
}: {
  title: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  widthClassName?: string;
}) {
  return (
    <section className={cn(customExerciseFilterRailCardClassName, "h-auto min-h-0", widthClassName)}>
      <button
        ref={buttonRef}
        type="button"
        className="group -my-2.5 flex min-h-11 w-full flex-col justify-center select-none appearance-none !border-0 !border-transparent !bg-transparent px-3 py-0 text-center caret-transparent shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-[1px]">
          <div className="grid grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-1.5">
            <span aria-hidden="true" />
            <span
              className={cn(
                appTokens.exercisePickerFilterGroupLabel,
                "min-w-0 text-center leading-none",
                isOpen ? "text-[rgb(var(--text-primary)/0.98)]" : undefined,
              )}
            >
              {title}
            </span>
            <span
              className={cn(
                "flex justify-end transition-colors",
                isOpen ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)] group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              )}
            >
              {isOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
            </span>
          </div>
          <MetricAccentBar variant="thin" className="mx-auto w-full opacity-80 transition-opacity group-hover:opacity-100" />
        </div>
      </button>
    </section>
  );
}
