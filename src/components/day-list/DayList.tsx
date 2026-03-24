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
    return "In Session";
  }

  if (status.isCompleted) {
    return "Completed";
  }

  if (status.isToday) {
    return "Today";
  }

  if (status.isRest) {
    return "Rest Day";
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
  return <ul className="space-y-2">{children}</ul>;
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
  const resolvedSubtitle = [subtitle, metaText].filter(Boolean).join(" • ") || undefined;

  const card = (
    <ExerciseCard
      {...cardProps}
      subtitle={resolvedSubtitle}
      onPress={onPress}
      state={toExerciseCardState(state)}
      className={cn("items-center")}
      variant="interactive"
    />
  );

  return <DayListItem>{wrapper ? wrapper(card) : card}</DayListItem>;
}
