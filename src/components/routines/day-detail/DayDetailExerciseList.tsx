"use client";

import type { ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import { appTokens } from "@/components/ui/app/tokens";
import { AccentDotSeparatedText, SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar } from "@/components/ui/MetricItem";
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
  renderExpandedContent?: (item: DayDetailExerciseListItem) => React.ReactNode;
  className?: string;
};

function formatMetadataLabel(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildExerciseMetadataItems(item: DayDetailExerciseListItem) {
  return [
    formatMetadataLabel(item.primary_muscle),
    formatMetadataLabel(item.movement_pattern),
    formatMetadataLabel(item.equipment),
  ].filter((value): value is string => Boolean(value));
}

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
  const metadataItems = buildExerciseMetadataItems(item);
  const normalizedSummary = typeof summary === "string" ? normalizeEditDaySummary(summary) : null;
  const formattedSummary = normalizedSummary
    ? (
      <AccentDotSeparatedText
        text={normalizedSummary}
        className="min-w-0 max-w-full flex-nowrap gap-x-1.5 overflow-hidden whitespace-nowrap text-[9.75px] tracking-[0.01em] leading-[1.08] text-[rgb(var(--text-secondary)/0.88)]"
        itemClassName="shrink-0 whitespace-nowrap"
      />
    )
    : summary;

  return (
    <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 align-top">
      <span className="inline-flex min-w-0 flex-1 basis-0 flex-col">
        <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-y-1 align-middle">
          <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
            <span className="min-w-0 max-w-full whitespace-normal break-words text-[0.98rem] font-semibold leading-[1.18] text-[rgb(var(--text)/0.98)]">
              {item.name}
            </span>
            <MetricAccentBar variant="thin" className="w-full opacity-80" />
          </span>
          <SignatureInlineList
            separator="pipe"
            className="!flex-nowrap min-w-0 max-w-full gap-x-1.5 gap-y-0 overflow-hidden whitespace-nowrap text-[9.75px] font-medium leading-[1.08] text-[rgb(var(--text-secondary)/0.9)]"
            itemClassName="inline-flex shrink-0 items-center whitespace-nowrap leading-[1.02]"
            items={metadataItems.map((value, index) => (
              <span
                key={`${item.id}-${value}-${index}`}
                className={cn(
                  "inline-flex min-w-0 items-center align-middle",
                  index === 0 ? "text-[rgb(var(--accent-strong)/0.98)]" : undefined,
                )}
              >
                {value}
              </span>
            ))}
          />
        </span>
      </span>
      {formattedSummary ? (
        <span className="inline-flex min-w-0 shrink-0 items-stretch gap-1.25 pt-[1px]">
          <SignatureMiniPipe
            className="mt-[1px] h-auto min-h-[2.85rem] self-stretch"
            barClassName="h-full min-h-[2.85rem]"
          />
          <span className="inline-flex max-w-[8.35rem] min-w-0 flex-col items-start gap-y-1 text-left">
            <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
              <span className="min-w-0 max-w-full whitespace-nowrap text-[0.9rem] font-semibold leading-[1.18] text-[rgb(var(--text)/0.92)]">
                Current Target
              </span>
              <MetricAccentBar variant="thin" className="w-full opacity-75" />
            </span>
            <span className="min-w-0 max-w-full overflow-hidden whitespace-nowrap text-ellipsis">
              {formattedSummary}
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

const dayDetailInfoButtonClassName = "pointer-events-auto absolute bottom-[0.3rem] right-[0.3rem] z-[3] inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--bg-app)/0.84)] text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] shadow-[0_0_10px_rgb(var(--accent)/0.1)] backdrop-blur-[16px] transition-colors hover:border-[rgb(var(--accent)/0.42)] hover:text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";

export function DayDetailExerciseList({
  items,
  mode,
  density,
  activeItemId = null,
  showOrderBadges = mode === "editable",
  onSelectItem,
  onInfoItem,
  renderOverlayActions,
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

        return (
          <li key={item.id} className={appTokens.routineEditorReorderItem} data-exercise-row-id={item.id}>
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
                contentClassName="pr-10"
                subtitleTone="plain"
                showLeadingVisual={policy.showMedia}
                showAccentRail
                hideEmptySummary
                rightIconMode="overlay"
                overlayActions={editableOverlayActions}
                overlayActionsClassName={editableOverlayActionsClassName}
                rightIcon={null}
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
                contentClassName={mode === "editable" ? "pr-10" : "pl-3"}
                showLeadingVisual={policy.showMedia}
                showAccentRail
                hideEmptySummary={mode === "editable" || isStretchHub}
                overlayActions={mode === "editable" ? editableOverlayActions : undefined}
                overlayActionsClassName={mode === "editable" ? editableOverlayActionsClassName : undefined}
                rightIcon={mode === "editable" ? null : undefined}
                rightIconMode={mode === "editable" ? "overlay" : undefined}
                surface={mode === "editable" ? "edit-day" : undefined}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
