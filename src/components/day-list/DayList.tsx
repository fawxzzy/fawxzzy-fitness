import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
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
  return <ul className="space-y-1.5 sm:space-y-2">{children}</ul>;
}

function DayListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export type DayCardProps = {
  onPress?: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  metaText?: string;
  state?: DayListState;
  rightIcon?: ReactNode;
  wrapper?: (child: ReactNode) => ReactNode;
};

export function DayCard({ onPress, wrapper, state = "default", metaText, subtitle, ...cardProps }: DayCardProps) {
  const resolvedSubtitle = [subtitle, metaText].filter(Boolean).join(" · ") || undefined;

  const card = (
    <ExerciseCard
      {...cardProps}
      subtitle={resolvedSubtitle}
      onPress={onPress}
      state={toExerciseCardState(state)}
      className={cn("shadow-none")}
      contentClassName="space-y-0.5 sm:space-y-1"
      titleClassName="[text-wrap:pretty]"
      subtitleClassName="[text-wrap:pretty] line-clamp-2"
      variant="compact"
    />
  );

  return <DayListItem>{wrapper ? wrapper(card) : card}</DayListItem>;
}
