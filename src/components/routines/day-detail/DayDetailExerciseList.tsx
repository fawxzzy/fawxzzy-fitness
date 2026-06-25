"use client";

import type { ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import {
  buildExerciseCardMetadataItems,
  ExerciseCardMetadataLine,
  ExerciseCardProgressionStateInline,
  ExerciseCardStandardTitle,
} from "@/components/workout/ExerciseCardStandardTitle";
import { StateChevron } from "@/components/ui/StateChevron";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

export type DayDetailExerciseListItem = {
  id: string;
  exerciseId?: string;
  name: string;
  summary: string | null;
  summaryContent?: ReactNode;
  progressionModeLabel?: "Auto" | "Manual" | null;
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

function DayDetailExerciseTitle({
  item,
  summary,
}: {
  item: DayDetailExerciseListItem;
  summary?: ReactNode;
}) {
  const metadataItems = buildExerciseCardMetadataItems({
    primaryMuscle: item.primary_muscle,
    movementPattern: item.movement_pattern,
    equipment: item.equipment,
  });
  const normalizedSummary = typeof summary === "string" ? normalizeEditDaySummary(summary) : summary;

  return (
    <ExerciseCardStandardTitle
      name={item.name}
      metadata={<ExerciseCardMetadataLine items={metadataItems} />}
      rightContent={normalizedSummary ?? undefined}
      rightAccessory={item.progressionModeLabel ? (
        <ExerciseCardProgressionStateInline label={item.progressionModeLabel.toUpperCase()} />
      ) : undefined}
    />
  );
}

const dayDetailInfoButtonClassName = "pointer-events-auto absolute bottom-[0.3rem] right-[0.3rem] z-[3] inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--bg-app)/0.84)] text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] shadow-[0_0_10px_rgb(var(--accent)/0.1)] backdrop-blur-[16px] transition-colors hover:border-[rgb(var(--accent)/0.42)] hover:text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";
const dayDetailEditableChevronRailClassName = "!right-[0.58rem] !top-[0.58rem] !translate-y-0";
const dayDetailEditableChevronClassName = cn("h-[1.05rem] w-[1.05rem] shrink-0", appTokens.historyChevronIcon);
const dayDetailEditableTitleContainerClassName = "pr-[2.45rem] pb-[1.9rem]";

export function DayDetailExerciseList({
  items,
  mode,
  density,
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
  const editableOverlayActionsClassName = "inset-0 !right-0 !top-0 !translate-y-0 !block pointer-events-none";

  return (
    <ul className={cn("space-y-1.5", className)}>
      {renderedItems.map((item) => {
        const isActive = activeItemId === item.id;
        const isStretchHub = isStretchHubExercise(item);
        const resolvedSummary = isStretchHub ? undefined : normalizeEditDaySummary(item.summary);
        const resolvedSummaryContent = isStretchHub ? undefined : item.summaryContent;
        const editableCompanionSummary = mode === "editable" && !resolvedSummaryContent && typeof resolvedSummary === "string"
          ? resolvedSummary
          : undefined;
        const editableOverlayActions = (
          <>
            {renderOverlayActions?.(item)}
            {onInfoItem ? (
              <button
                type="button"
                aria-label={`Open exercise info for ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onInfoItem(item);
                }}
                className={dayDetailInfoButtonClassName}
              >
                <span aria-hidden="true">i</span>
              </button>
            ) : null}
          </>
        );
        const exerciseVisual = {
          name: item.name,
          slug: item.slug,
          image_path: item.image_path,
          image_icon_path: item.image_icon_path,
          image_howto_path: item.image_howto_path,
        };
        const editableChevron = (
          <StateChevron
            expanded={isActive}
            className={dayDetailEditableChevronClassName}
            expandedClassName="text-[rgb(var(--accent-strong)/0.98)]"
            collapsedClassName="text-[rgb(var(--text-muted)/0.88)]"
          />
        );

        return (
          <li
            key={item.id}
            className={cn(appTokens.routineEditorReorderItem, mode === "editable" ? "relative" : undefined)}
            data-exercise-row-id={item.id}
          >
            <div className={mode === "editable" && renderRowActions ? "pr-[40px]" : undefined}>
              {mode === "editable" && interactive ? (
                <ExerciseDisclosureCard
                  scope="day-detail"
                  itemId={item.id}
                  expanded={isActive}
                  onToggle={() => onSelectItem?.(item)}
                  exercise={exerciseVisual}
                  title={<DayDetailExerciseTitle item={item} summary={editableCompanionSummary} />}
                  summary={mode === "editable" ? undefined : resolvedSummary}
                  summaryContent={resolvedSummaryContent}
                  summaryLabel={undefined}
                  state={isActive ? "selected" : "default"}
                  semanticTone="current"
                  badgeText={showOrderBadges ? `ORDER ${item.orderNumber}` : undefined}
                  bodyClassName={appTokens.routineEditorReorderBody}
                  contentClassName="pr-[2.45rem]"
                  titleContainerClassName={dayDetailEditableTitleContainerClassName}
                  subtitleTone="plain"
                  showLeadingVisual={policy.showMedia}
                  showAccentRail
                  hideEmptySummary
                  rightIconMode="overlay"
                  overlayActions={editableOverlayActions}
                  overlayActionsClassName={editableOverlayActionsClassName}
                  rightIcon={editableChevron}
                  rightRailClassName={dayDetailEditableChevronRailClassName}
                  surface="edit-day"
                  stickyHeaderWhenExpanded={mode === "editable"}
                >
                  {renderExpandedContent?.(item)}
                </ExerciseDisclosureCard>
              ) : (
                <StandardExerciseRow
                  title={mode === "editable" ? <DayDetailExerciseTitle item={item} summary={editableCompanionSummary} /> : undefined}
                  exercise={exerciseVisual}
                  summary={mode === "editable" ? undefined : resolvedSummary}
                  summaryContent={resolvedSummaryContent}
                  summaryLabel={mode === "editable" ? (isStretchHub ? "" : "Goal") : undefined}
                  subtitleTone="plain"
                  variant={interactive ? "interactive" : "standard"}
                  density={density}
                  state="default"
                  semanticTone="current"
                  onPress={interactive ? () => onSelectItem?.(item) : undefined}
                  badgeText={mode === "editable" && showOrderBadges ? `ORDER ${item.orderNumber}` : undefined}
                  bodyClassName={mode === "editable" ? appTokens.routineEditorReorderBody : undefined}
                  className={cn("w-full", appTokens.routineEditorReorderBase)}
                  contentClassName={mode === "editable" ? "pr-[2.45rem]" : "pl-3"}
                  showLeadingVisual={policy.showMedia}
                  showAccentRail
                  hideEmptySummary
                  overlayActions={mode === "editable" ? editableOverlayActions : undefined}
                  overlayActionsClassName={mode === "editable" ? editableOverlayActionsClassName : undefined}
                  rightIcon={mode === "editable" ? editableChevron : undefined}
                  rightIconMode={mode === "editable" ? "overlay" : undefined}
                  rightRailClassName={mode === "editable" ? dayDetailEditableChevronRailClassName : undefined}
                  surface={mode === "editable" ? "edit-day" : undefined}
                />
              )}
            </div>
            {mode === "editable" ? renderRowActions?.(item) : null}
          </li>
        );
      })}
    </ul>
  );
}
