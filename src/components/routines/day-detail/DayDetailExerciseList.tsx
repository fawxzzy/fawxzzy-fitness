"use client";

import type { ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

export type DayDetailExerciseListItem = {
  id: string;
  name: string;
  summary: string | null;
  summaryContent?: ReactNode;
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
  renderOverlayActions?: (item: DayDetailExerciseListItem) => React.ReactNode;
  renderExpandedContent?: (item: DayDetailExerciseListItem) => React.ReactNode;
  className?: string;
};

export function DayDetailExerciseList({
  items,
  mode,
  density,
  activeItemId = null,
  showOrderBadges = mode === "editable",
  onSelectItem,
  renderOverlayActions,
  renderExpandedContent,
  className,
}: Props) {
  const interactive = Boolean(onSelectItem);
  const policy = resolveWorkoutCardSurfacePolicy(mode === "editable" ? "edit-day" : "view-day", "compact");
  const renderedItems = activeItemId
    ? items.filter((item) => item.id === activeItemId)
    : items;
  const editableOverlayActionsClassName = "right-[3.15rem]";
  const editableChevronOverlayClassName = "right-[0.45rem]";

  return (
    <ul className={cn("space-y-1.5", className)}>
      {renderedItems.map((item) => {
        const isActive = activeItemId === item.id;
        const isStretchHub = isStretchHubExercise(item);
        const resolvedSummary = isStretchHub ? undefined : item.summary;
        const resolvedSummaryContent = isStretchHub ? undefined : item.summaryContent;
        const exerciseVisual = {
          name: item.name,
          slug: item.slug,
          image_path: item.image_path,
          image_icon_path: item.image_icon_path,
          image_howto_path: item.image_howto_path,
        };

        return (
          <li key={item.id} className={appTokens.routineEditorReorderItem} data-exercise-row-id={item.id}>
            {mode === "editable" && interactive ? (
              <ExerciseDisclosureCard
                scope="day-detail"
                itemId={item.id}
                expanded={isActive}
                onToggle={() => onSelectItem?.(item)}
                exercise={exerciseVisual}
                summary={resolvedSummary}
                summaryContent={resolvedSummaryContent}
                summaryLabel={isStretchHub ? "" : "Goal"}
                state={isActive ? "selected" : "default"}
                badgeText={showOrderBadges ? `ORDER ${item.orderNumber}` : undefined}
                bodyClassName={appTokens.routineEditorReorderBody}
                subtitleTone="plain"
                showLeadingVisual={policy.showMedia}
                showAccentRail={!isStretchHub}
                hideEmptySummary={isStretchHub}
                rightIconMode="overlay"
                overlayActions={renderOverlayActions?.(item)}
                overlayActionsClassName={editableOverlayActionsClassName}
                rightRailClassName={mode === "editable" ? editableChevronOverlayClassName : undefined}
                stickyHeaderWhenExpanded={mode === "editable"}
              >
                {renderExpandedContent?.(item)}
              </ExerciseDisclosureCard>
            ) : (
              <StandardExerciseRow
                exercise={exerciseVisual}
                summary={resolvedSummary}
                summaryContent={resolvedSummaryContent}
                summaryLabel={mode === "editable" ? (isStretchHub ? "" : "Goal") : undefined}
                subtitleTone="plain"
                variant={interactive ? "interactive" : "standard"}
                density={density}
                state="default"
                onPress={interactive ? () => onSelectItem?.(item) : undefined}
                badgeText={mode === "editable" && showOrderBadges ? `ORDER ${item.orderNumber}` : undefined}
                bodyClassName={mode === "editable" ? appTokens.routineEditorReorderBody : undefined}
                className={cn("w-full", appTokens.routineEditorReorderBase)}
                contentClassName={mode === "editable" ? undefined : "pl-3"}
                showLeadingVisual={policy.showMedia}
                showAccentRail={!isStretchHub}
                hideEmptySummary={isStretchHub}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
