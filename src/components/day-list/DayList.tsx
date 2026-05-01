import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export const REST_DAY_CARD_COPY = "Recover, move lightly, and come back ready for the next workout.";

export type DayListState = "default" | "selected" | "completed" | "inSession" | "rest";

export type DayCardStatus = {
  isSelected?: boolean;
  isToday?: boolean;
  isRest?: boolean;
  isCompleted?: boolean;
  isInSession?: boolean;
};

function toExerciseCardState(state: DayListState): ComponentProps<typeof ExerciseCard>["state"] {
  if (state === "selected") {
    return "selected";
  }

  if (state === "completed") {
    return "completed";
  }

  if (state === "inSession") {
    return "active";
  }

  if (state === "rest") {
    return "empty";
  }

  return "default";
}

export function resolveDayCardState(status: DayCardStatus): DayListState {
  if (status.isSelected) {
    return "selected";
  }

  if (status.isInSession) {
    return "inSession";
  }

  if (status.isCompleted) {
    return "completed";
  }

  if (status.isRest) {
    return "rest";
  }

  return "default";
}

export function resolveDayCardBadgeText(status: DayCardStatus): string | undefined {
  if (status.isInSession) {
    return "ACTIVE";
  }

  if (status.isCompleted) {
    return "COMPLETED";
  }

  if (status.isToday) {
    return "TODAY";
  }

  if (status.isRest) {
    return "REST DAY";
  }

  return undefined;
}

export function formatLoggedSetCount(loggedSetCount?: number | null): string | undefined {
  if (!Number.isFinite(loggedSetCount) || (loggedSetCount ?? 0) <= 0) {
    return undefined;
  }

  return `${Math.floor(loggedSetCount as number)} logged`;
}

export function DayList({ children }: { children: ReactNode }) {
  return <ul className={appTokens.dayListStack}>{children}</ul>;
}

function resolveDayCardSubtitle(subtitle: ReactNode, metaText?: string) {
  if (!metaText) {
    return subtitle;
  }

  if (subtitle === null || subtitle === undefined || subtitle === false) {
    return metaText;
  }

  if (typeof subtitle === "string" || typeof subtitle === "number") {
    return `${subtitle} \u00B7 ${metaText}`;
  }

  return (
    <>
      {subtitle}
      <span aria-hidden="true"> {"\u00B7"} </span>
      <span>{metaText}</span>
    </>
  );
}

function DayListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export type DayCardProps = {
  onPress?: () => void;
  title: ReactNode;
  titleMeta?: ReactNode;
  subtitle?: ReactNode;
  subtitleLabel?: string;
  subtitleTone?: "panel" | "plain";
  badgeText?: string;
  metaText?: string;
  state?: DayListState;
  rightIcon?: ReactNode;
  showAccentRail?: boolean;
  wrapper?: (child: ReactNode) => ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
};

export function DayCard({
  onPress,
  wrapper,
  state = "default",
  metaText,
  subtitle,
  subtitleLabel,
  subtitleTone = "panel",
  showAccentRail = true,
  bodyClassName,
  contentClassName,
  titleClassName,
  subtitleClassName,
  className,
  titleMeta,
  ...cardProps
}: DayCardProps) {
  const resolvedSubtitle = resolveDayCardSubtitle(subtitle, metaText);

  const card = (
    <ExerciseCard
      {...cardProps}
      titleMeta={titleMeta}
      subtitle={resolvedSubtitle}
      subtitleLabel={subtitleLabel}
      subtitleTone={subtitleTone}
      onPress={onPress}
      state={toExerciseCardState(state)}
      className={cn(appTokens.routinesOverviewCardFlat, className)}
      bodyClassName={bodyClassName}
      contentClassName={cn(appTokens.dayCardContent, contentClassName)}
      titleClassName={cn(appTokens.dayCardTitle, titleClassName)}
      subtitleClassName={cn(appTokens.dayCardSubtitle, subtitleClassName)}
      variant="list"
      showAccentRail={showAccentRail}
    />
  );

  return <DayListItem>{wrapper ? wrapper(card) : card}</DayListItem>;
}
