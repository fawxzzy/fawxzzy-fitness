import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { appTokens } from "@/components/ui/app/tokens";

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

function DayListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export type DayCardProps = {
  onPress?: () => void;
  title: string;
  subtitle?: string;
  subtitleLabel?: string;
  badgeText?: string;
  metaText?: string;
  state?: DayListState;
  rightIcon?: ReactNode;
  showAccentRail?: boolean;
  wrapper?: (child: ReactNode) => ReactNode;
};

export function DayCard({ onPress, wrapper, state = "default", metaText, subtitle, subtitleLabel, showAccentRail = true, ...cardProps }: DayCardProps) {
  const resolvedSubtitle = [subtitle, metaText].filter(Boolean).join(" · ") || undefined;

  const card = (
    <ExerciseCard
      {...cardProps}
      subtitle={resolvedSubtitle}
      subtitleLabel={subtitleLabel}
      onPress={onPress}
      state={toExerciseCardState(state)}
      className={appTokens.routinesOverviewCardFlat}
      contentClassName={appTokens.dayCardContent}
      titleClassName={appTokens.dayCardTitle}
      subtitleClassName={appTokens.dayCardSubtitle}
      variant="list"
      showAccentRail={showAccentRail}
    />
  );

  return <DayListItem>{wrapper ? wrapper(card) : card}</DayListItem>;
}
