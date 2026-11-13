"use client";

import type { ReactNode } from "react";
import { ExerciseRowCard } from "@/components/workout/ExerciseRowCard";
import { buildExerciseCardMetadataItems } from "@/components/workout/ExerciseCardStandardTitle";
import { CardInfoButton, cardTokens, type CardHeaderInteraction } from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import { buildExerciseDisclosureContract } from "@/lib/exercise-disclosure";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

export type DayDetailExerciseListItem = {
  id: string;
  exerciseId?: string;
  name: string;
  summary: string | null;
  summaryContent?: ReactNode;
  progressionStateLabel?: string | null;
  orderNumber: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  slug?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

type Props = {
  items: DayDetailExerciseListItem[];
  mode: "read_only" | "editable";
  density?: "compact" | "detailed";
  activeItemId?: string | null;
  showOrderBadges?: boolean;
  onSelectItem?: (item: DayDetailExerciseListItem) => void;
  onInfoItem?: (item: DayDetailExerciseListItem) => void;
  /** Standalone controls rendered before the info button (the drag handle). */
  renderOverlayActions?: (item: DayDetailExerciseListItem) => React.ReactNode;
  renderRowActions?: (item: DayDetailExerciseListItem) => React.ReactNode;
  renderExpandedContent?: (item: DayDetailExerciseListItem) => React.ReactNode;
  className?: string;
};

function normalizeEditDaySummary(summary: string | null | undefined) {
  if (!summary) {
    return null;
  }

  const normalized = normalizeDecoratedText(summary)
    .replace(/^goal\s*:\s*/i, "")
    .trim();

  if (!normalized || normalized.toLowerCase() === "goal missing") {
    return null;
  }

  return normalized;
}

function splitDecoratedValues(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return normalizeDecoratedText(value)
    .split(/\s+[•|·]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Planned-exercise list on the day editor, on the shared exercise card (ExerciseRowCard).
 * - editable + interactive: header toggles the editor panel (aria-expanded, panel id and test ids unchanged).
 * - read-only + interactive: header runs onSelectItem.
 * - drag handle (`renderOverlayActions`) and info button are separate 44px controls, handle first, then info.
 * `data-exercise-row-id` stays on each `li`: the pointer drag finds its drop target through it.
 */
export function DayDetailExerciseList({
  items,
  mode,
  activeItemId = null,
  showOrderBadges = mode === "editable",
  onSelectItem,
  onInfoItem,
  renderOverlayActions,
  renderRowActions,
  renderExpandedContent,
  className,
}: Props) {
  const interactive = Boolean(onSelectItem);
  const policy = resolveWorkoutCardSurfacePolicy(mode === "editable" ? "edit-day" : "view-day", "compact");
  const renderedItems = activeItemId
    ? items.filter((item) => item.id === activeItemId)
    : items;

  return (
    <ul className={cn(cardTokens.list, className)}>
      {renderedItems.map((item) => {
        const isActive = activeItemId === item.id;
        const isStretchHub = isStretchHubExercise(item);
        const contract = buildExerciseDisclosureContract({ itemId: item.id, scope: "day-detail" });
        const factItems = buildExerciseCardMetadataItems({
          primaryMuscle: item.primary_muscle,
          movementPattern: item.movement_pattern,
          equipment: item.equipment,
        }).slice(0, mode === "editable" ? 2 : 3);
        // Order cue for reordering: the position is the first meta fact ("Order 2"), text, not colour.
        const metaItems = showOrderBadges ? [`Order ${item.orderNumber}`, ...factItems] : factItems;
        const summary = isStretchHub ? null : normalizeEditDaySummary(item.summary);
        const interaction: CardHeaderInteraction = !interactive
          ? { kind: "none" }
          : mode === "editable"
            ? {
              kind: "toggle",
              expanded: isActive,
              onToggle: () => onSelectItem?.(item),
              controlsId: isActive ? contract.panelId : undefined,
              buttonProps: { "data-testid": contract.buttonTestId },
            }
            : { kind: "press", onPress: () => onSelectItem?.(item) };
        const handle = mode === "editable" ? renderOverlayActions?.(item) : null;
        const trailing = handle || onInfoItem ? (
          <>
            {handle}
            {onInfoItem ? (
              <CardInfoButton
                label={`Open exercise info for ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onInfoItem(item);
                }}
              />
            ) : null}
          </>
        ) : undefined;

        return (
          <li key={item.id} className="min-w-0" data-exercise-row-id={item.id}>
            <ExerciseRowCard
              exercise={{
                name: item.name,
                slug: item.slug,
                image_path: item.image_path,
                image_icon_path: item.image_icon_path,
                image_howto_path: item.image_howto_path,
              }}
              metaItems={metaItems}
              targetValues={splitDecoratedValues(summary)}
              progressionLabel={item.progressionStateLabel?.trim() ? normalizeDecoratedText(item.progressionStateLabel).replace(/\s+[•|]\s+/g, " · ") : null}
              showMedia={policy.showMedia}
              tone={isActive ? "current" : "neutral"}
              interaction={interaction}
              trailing={trailing}
              stickyHeader={mode === "editable"}
              panel={mode === "editable" && isActive ? renderExpandedContent?.(item) : undefined}
              panelProps={{ id: contract.panelId, "data-testid": contract.panelTestId }}
            />
            {mode === "editable" ? renderRowActions?.(item) : null}
          </li>
        );
      })}
    </ul>
  );
}
