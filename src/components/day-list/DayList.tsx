import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { cn } from "@/lib/cn";

export type DayListState = "default" | "selected" | "rest";

function toExerciseCardState(state: DayListState): ComponentProps<typeof ExerciseCard>["state"] {
  if (state === "selected") {
    return "selected";
  }

  if (state === "rest") {
    return "empty";
  }

  return "default";
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
  state?: DayListState;
  rightIcon?: ReactNode;
  wrapper?: (child: ReactNode) => ReactNode;
};

export function DayCard({ onPress, wrapper, state = "default", ...cardProps }: DayCardProps) {
  const card = (
    <ExerciseCard
      {...cardProps}
      onPress={onPress}
      state={toExerciseCardState(state)}
      className={cn("items-center")}
      variant="interactive"
    />
  );

  return <DayListItem>{wrapper ? wrapper(card) : card}</DayListItem>;
}
