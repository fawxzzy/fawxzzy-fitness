"use client";

import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import { cn } from "@/lib/cn";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

export type DayDetailExerciseListItem = {
  id: string;
  name: string;
  summary: string | null;
  orderNumber: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | null;
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
  activeItemId?: string | null;
  onSelectItem?: (item: DayDetailExerciseListItem) => void;
  renderExpandedContent?: (item: DayDetailExerciseListItem) => React.ReactNode;
  className?: string;
};

export function DayDetailExerciseList({
  items,
  mode,
  activeItemId = null,
  onSelectItem,
  renderExpandedContent,
  className,
}: Props) {
  const interactive = Boolean(onSelectItem);
  const policy = resolveWorkoutCardSurfacePolicy(mode === "editable" ? "edit-day" : "view-day", "compact");

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => {
        const isActive = activeItemId === item.id;
        const exerciseVisual = {
          name: item.name,
          slug: item.slug,
          image_path: item.image_path,
          image_icon_path: item.image_icon_path,
          image_howto_path: item.image_howto_path,
        };

        return (
          <li key={item.id} className="rounded-[1.3rem] transition-all">
            {mode === "editable" && interactive ? (
              <ExerciseDisclosureCard
                scope="day-detail"
                itemId={item.id}
                expanded={isActive}
                onToggle={() => onSelectItem?.(item)}
                exercise={exerciseVisual}
                summary={item.summary ?? undefined}
                summaryLabel="Goal"
                state={isActive ? "selected" : "default"}
                badgeText={`ORDER ${item.orderNumber}`}
                showLeadingVisual={policy.showMedia}
              >
                {renderExpandedContent?.(item)}
              </ExerciseDisclosureCard>
            ) : (
              <StandardExerciseRow
                exercise={exerciseVisual}
                summary={item.summary ?? undefined}
                summaryLabel="Goal"
                variant={interactive ? "interactive" : "standard"}
                state="default"
                onPress={interactive ? () => onSelectItem?.(item) : undefined}
                badgeText={mode === "editable" ? `ORDER ${item.orderNumber}` : undefined}
                className="w-full shadow-none"
                showLeadingVisual={policy.showMedia}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
