"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  buildRoutineSplitParts,
  renderRoutineMetricTagLabel,
  splitRoutineSummaryParts,
  ROUTINE_SURFACE_TAG_CLASS_NAME,
  type RoutineDayCardSummary,
} from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesListItemCard } from "@/components/routines/RoutinesScreenFamily";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";

export type RoutineBrowseCardItem = {
  id: string;
  name: string;
  summary?: string;
  summaryParts?: string[];
  href?: string;
  isActive?: boolean;
  createdAt?: string | null;
  previewDays?: Array<{
    id: string;
    dayIndex: number;
    title: string;
    weekdayLabel: string;
    isRest: boolean;
    isCompleted?: boolean;
    isSkipped?: boolean;
    exerciseCount: number;
    splitSummary?: RoutineDayCardSummary;
  }>;
};

const ROUTINES_BROWSE_CARD_BODY_CLASS_NAME = "min-h-[7.2rem] py-[0.72rem]";
const ROUTINES_BROWSE_CARD_CONTENT_CLASS_NAME = "gap-1.5 pt-[0.1rem] pb-0";
const ROUTINES_BROWSE_CARD_PREVIEW_GRID_CLASS_NAME = "grid gap-2 pt-1";
const ROUTINES_BROWSE_CARD_SCROLL_WRAPPER_CLASS_NAME = "-mx-1";
const ROUTINES_BROWSE_CARD_PREVIEW_SCROLL_CLASS_NAME = "pl-1 pr-[1.7rem] pb-1 sm:pr-[1.2rem]";
const ROUTINES_BROWSE_CARD_PREVIEW_ROW_CLASS_NAME = "flex w-max min-w-full items-center justify-start gap-2 pr-[1.35rem] sm:justify-center sm:pr-0";
const ROUTINES_BROWSE_CARD_PREVIEW_TILE_CLASS_NAME = "grid min-h-[6.1rem] w-[15rem] min-w-[15rem] content-start gap-2 rounded-[1rem] border-2 border-[rgb(var(--accent-divider-rgb)/0.4)] bg-[rgb(var(--surface-2-rgb)/0.58)] px-2.5 py-2.5 shadow-[inset_0_0_0_1px_rgb(var(--accent-divider-rgb)/0.08)] sm:w-[17rem] sm:min-w-[17rem] sm:px-3";
const ROUTINES_BROWSE_CARD_REST_PREVIEW_TILE_CLASS_NAME = "min-h-[2.05rem] w-[6.8rem] min-w-[6.8rem] content-center gap-0 border-[rgb(var(--accent-yellow-on)/0.5)] bg-[rgb(var(--accent-yellow-off)/0.1)] px-2 py-[0.45rem] sm:w-[7.15rem] sm:min-w-[7.15rem]";
const ROUTINES_BROWSE_CARD_PREVIEW_HEADER_CLASS_NAME = "grid w-full min-w-0 justify-items-center gap-1";
const ROUTINES_BROWSE_CARD_PREVIEW_TITLE_CLASS_NAME = "block max-w-full text-center text-[0.88rem] font-semibold leading-tight [text-wrap:balance]";
const ROUTINES_BROWSE_CARD_PREVIEW_META_LINE_CLASS_NAME = "inline-flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center";
const ROUTINES_BROWSE_CARD_PREVIEW_TAG_ROW_CLASS_NAME = "flex min-w-0 flex-wrap items-center justify-center gap-1 sm:gap-1.5";
const ROUTINES_BROWSE_CARD_PREVIEW_TAG_CLASS_NAME = `${ROUTINE_SURFACE_TAG_CLASS_NAME} max-w-full whitespace-normal px-[0.48rem] py-[0.22rem] text-center text-[9.5px] sm:px-[0.6875rem] sm:py-[0.3125rem] sm:text-[11px]`;
const ROUTINES_BROWSE_CARD_SUMMARY_SCROLL_WRAPPER_CLASS_NAME = "-mx-1";
const ROUTINES_BROWSE_CARD_SUMMARY_SCROLL_CLASS_NAME = "pl-1 pr-[1.55rem] pb-0.5 sm:px-1";
const ROUTINES_BROWSE_CARD_SUMMARY_ROW_CLASS_NAME = "flex w-max min-w-full items-center justify-start gap-1 pr-[1.35rem] sm:justify-center sm:gap-1.5 sm:pr-0";
const ROUTINES_BROWSE_CARD_CHEVRON_OVERLAY_CLASS_NAME = "!right-0 !top-0 !bottom-0 !translate-y-0";
const ROUTINES_BROWSE_CARD_CHEVRON_STACK_CLASS_NAME = "h-full w-[0.95rem] items-center justify-center rounded-r-[inherit] bg-[linear-gradient(270deg,rgba(var(--surface-rgb),0.34)_0%,rgba(var(--surface-rgb),0.16)_56%,rgba(var(--surface-rgb),0.02)_100%)] shadow-[-8px_0_18px_rgb(0_0_0/0.08)] backdrop-blur-[14px] sm:w-[1.35rem]";

function renderRoutineBrowseSummaryTagLabel(value: string) {
  const normalizedValue = value.trim();
  const normalizedLowerValue = normalizedValue.toLowerCase();
  if (!normalizedValue.match(/^\d/)) {
    const mobileLabel = normalizedLowerValue === "no sessions logged"
      ? "No logs"
      : normalizedLowerValue === "not started"
        ? "New"
        : normalizedLowerValue.startsWith("last ")
          ? normalizedValue.slice(5).trim()
          : normalizedValue;

    return (
      <>
        <span className="sm:hidden">{mobileLabel}</span>
        <span className="hidden sm:inline">{normalizedValue}</span>
      </>
    );
  }

  const match = normalizedValue.match(/^(\d+(?:[.,]\d+)?)(\s+.*)?$/);
  if (!match) {
    return normalizedValue;
  }

  const [, count, suffix = ""] = match;
  const trimmedSuffix = suffix.trim().toLowerCase();
  const mobileSuffix = trimmedSuffix === "workout plans"
    ? "plans"
    : trimmedSuffix === "sessions logged"
      ? "logs"
      : suffix.trim();

  return (
    <>
      <span className="text-[rgb(var(--text-primary))]">{count}</span>
      {trimmedSuffix ? (
        <>
          <span className="ml-1 sm:hidden">{mobileSuffix}</span>
          <span className="ml-1 hidden sm:inline">{suffix.trim()}</span>
        </>
      ) : null}
    </>
  );
}

function renderRoutineBrowseRightRail() {
  return (
    <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center">
      <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />
    </span>
  );
}

function renderRoutinePreviewHeader(day: NonNullable<RoutineBrowseCardItem["previewDays"]>[number]) {
  return (
    <div className={cn(ROUTINES_BROWSE_CARD_PREVIEW_HEADER_CLASS_NAME, day.isRest ? "gap-0.5" : undefined)}>
      <span className={cn(
        ROUTINES_BROWSE_CARD_PREVIEW_TITLE_CLASS_NAME,
        day.isRest ? "text-[rgb(var(--accent-yellow-on))]" : "text-[rgb(var(--text-primary))]",
      )}>
        {day.title}
      </span>
      <div className={ROUTINES_BROWSE_CARD_PREVIEW_META_LINE_CLASS_NAME}>
        <span className={cn(
          "self-center text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]",
        )}>
          {day.weekdayLabel}
        </span>
        <SignatureDot className="self-center" />
        <span className="self-center text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]">
          {day.dayIndex}
        </span>
      </div>
      {day.isRest ? null : <MetricAccentBar variant="thin" className="mt-1 w-16 opacity-85" />}
    </div>
  );
}

function renderRoutinePreviewMeta(day: NonNullable<RoutineBrowseCardItem["previewDays"]>[number]) {
  const renderTagRail = (content: ReactNode) => (
    <div className={ROUTINES_BROWSE_CARD_PREVIEW_TAG_ROW_CLASS_NAME}>{content}</div>
  );

  if (day.isRest) {
    return null;
  }

  if (day.splitSummary) {
    const splitParts = buildRoutineSplitParts(day.splitSummary);
    if (splitParts.length > 0) {
      return renderTagRail(
        <>
          {splitParts.map((part) => (
            <AppBadge key={part} tone="default" className={ROUTINES_BROWSE_CARD_PREVIEW_TAG_CLASS_NAME}>
              {renderRoutineMetricTagLabel(part)}
            </AppBadge>
          ))}
        </>,
      );
    }
  }

  if (day.exerciseCount <= 0) {
    return renderTagRail(
      <>
        <AppBadge tone="default" className={ROUTINES_BROWSE_CARD_PREVIEW_TAG_CLASS_NAME}>
          {renderRoutineMetricTagLabel("No exercises")}
        </AppBadge>
      </>,
    );
  }

  return renderTagRail(
    <>
      <AppBadge tone="default" className={ROUTINES_BROWSE_CARD_PREVIEW_TAG_CLASS_NAME}>
        {renderRoutineMetricTagLabel(`${day.exerciseCount} ${day.exerciseCount === 1 ? "exercise" : "exercises"}`)}
      </AppBadge>
    </>,
  );
}

function renderRoutineCreatedTag(createdAt: string | null | undefined) {
  const normalizedValue = typeof createdAt === "string" ? createdAt.trim() : "";
  if (!normalizedValue) {
    return null;
  }

  return `Created ${formatDateShort(normalizedValue)}`;
}

function renderRoutineSummaryTags(routine: RoutineBrowseCardItem) {
  const parts = routine.summaryParts?.length
    ? routine.summaryParts
    : splitRoutineSummaryParts(routine.summary ?? "");

  if (parts.length === 0) {
    return undefined;
  }

  return (
    <HorizontalScrollHint
      className={ROUTINES_BROWSE_CARD_SUMMARY_SCROLL_WRAPPER_CLASS_NAME}
      scrollClassName={ROUTINES_BROWSE_CARD_SUMMARY_SCROLL_CLASS_NAME}
      contentClassName={ROUTINES_BROWSE_CARD_SUMMARY_ROW_CLASS_NAME}
      showEdgeFades={false}
    >
      {parts.map((part) => (
        <AppBadge
          key={part}
          tone="default"
          className={`${ROUTINE_SURFACE_TAG_CLASS_NAME} px-[0.58rem] py-[0.24rem] text-[9.5px] sm:px-[0.6875rem] sm:py-[0.3125rem] sm:text-[11px]`}
        >
          {renderRoutineBrowseSummaryTagLabel(part)}
        </AppBadge>
      ))}
    </HorizontalScrollHint>
  );
}

function RoutineBrowsePreview({
  routine,
}: {
  routine: RoutineBrowseCardItem;
}) {
  if (!routine.previewDays?.length) {
    return null;
  }

  return (
    <div className={ROUTINES_BROWSE_CARD_PREVIEW_GRID_CLASS_NAME}>
      <HorizontalScrollHint
        className={ROUTINES_BROWSE_CARD_SCROLL_WRAPPER_CLASS_NAME}
        scrollClassName={ROUTINES_BROWSE_CARD_PREVIEW_SCROLL_CLASS_NAME}
        contentClassName={ROUTINES_BROWSE_CARD_PREVIEW_ROW_CLASS_NAME}
        showEdgeFades={false}
      >
        {routine.previewDays.map((day) => (
          <div
            key={day.id}
            className={cn(
              ROUTINES_BROWSE_CARD_PREVIEW_TILE_CLASS_NAME,
              day.isRest ? ROUTINES_BROWSE_CARD_REST_PREVIEW_TILE_CLASS_NAME : undefined,
            )}
          >
            {renderRoutinePreviewHeader(day)}
            {renderRoutinePreviewMeta(day)}
          </div>
        ))}
      </HorizontalScrollHint>
    </div>
  );
}

type RoutineBrowseCardProps = {
  routine: RoutineBrowseCardItem;
  onPress?: (() => void) | undefined;
  state?: ComponentProps<typeof RoutinesListItemCard>["state"];
  rightIcon?: ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  variant?: ComponentProps<typeof RoutinesListItemCard>["variant"];
  semanticTone?: CardSemanticTone;
  showPreviewDays?: boolean;
};

export function RoutineBrowseCard({
  routine,
  onPress,
  state = "default",
  rightIcon,
  className,
  bodyClassName = ROUTINES_BROWSE_CARD_BODY_CLASS_NAME,
  contentClassName = ROUTINES_BROWSE_CARD_CONTENT_CLASS_NAME,
  titleClassName = "!items-start !pr-24 text-left",
  variant = "standard",
  semanticTone,
  showPreviewDays = true,
}: RoutineBrowseCardProps) {
  const createdTag = renderRoutineCreatedTag(routine.createdAt);

  return (
    <RoutinesListItemCard
      title={(
        <span className="inline-flex min-w-0 max-w-full flex-wrap items-start gap-x-2 gap-y-1 text-left">
          <span className="inline-flex w-fit min-w-0 max-w-full flex-col items-start gap-1 text-left">
            <span className="text-[rgb(var(--accent)/0.98)]">{routine.name}</span>
            <MetricAccentBar variant="thin" className="w-full opacity-90" />
          </span>
          {createdTag ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 pt-[0.08rem] text-[9.5px] font-semibold uppercase leading-[1.1] tracking-[0.1em] text-[rgb(var(--text-secondary)/0.82)] sm:text-[10px]">
              <SignatureMiniPipe className="h-[0.88em] w-[0.38rem]" barClassName="w-[2px]" />
              <span>{createdTag}</span>
            </span>
          ) : null}
        </span>
      )}
      subtitle={renderRoutineSummaryTags(routine)}
      subtitleTone="plain"
      onPress={onPress}
      state={state}
      rightIcon={rightIcon === undefined ? renderRoutineBrowseRightRail() : rightIcon}
      rightRailClassName={ROUTINES_BROWSE_CARD_CHEVRON_OVERLAY_CLASS_NAME}
      trailingStackClassName={ROUTINES_BROWSE_CARD_CHEVRON_STACK_CLASS_NAME}
      rightIconMode="overlay"
      className={className}
      bodyClassName={bodyClassName}
      contentClassName={contentClassName}
      titleClassName={titleClassName}
      variant={variant}
      semanticTone={semanticTone}
    >
      {showPreviewDays ? <RoutineBrowsePreview routine={routine} /> : null}
    </RoutinesListItemCard>
  );
}
