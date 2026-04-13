"use client";

import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";
import { buildExerciseIdentityChips } from "@/lib/workout-card-view-models";

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

  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => {
        const isActive = activeItemId === item.id;
        const panelId = `day-detail-exercise-panel-${item.id}`;
        return (
          <li key={item.id} className="rounded-[1.3rem] transition-all">
            <div className="overflow-hidden rounded-[1.25rem]">
              <StandardExerciseRow
                exercise={{
                  name: item.name,
                  slug: item.slug,
                  image_path: item.image_path,
                  image_icon_path: item.image_icon_path,
                  image_howto_path: item.image_howto_path,
                }}
                summary={item.summary ?? undefined}
                summaryLabel="Goal"
                variant="interactive"
                state={isActive && mode === "editable" ? "selected" : "default"}
                onPress={interactive ? () => onSelectItem?.(item) : undefined}
                buttonProps={interactive ? {
                  "aria-expanded": mode === "editable" ? isActive : undefined,
                  "aria-controls": mode === "editable" ? panelId : undefined,
                  "data-testid": `day-detail-toggle-${item.id}`,
                } : undefined}
                badgeText={mode === "editable" ? `ORDER ${item.orderNumber}` : undefined}
                className={cn("w-full", isActive && mode === "editable" ? "rounded-b-none" : undefined)}
                rightIcon={(
                  <ChevronRightIcon
                    className={cn(
                      "h-4 w-4 text-[rgb(var(--text-muted)/0.8)] transition-transform duration-200",
                      isActive && mode === "editable" ? "rotate-90 text-[rgb(var(--text-secondary)/0.92)]" : undefined,
                    )}
                  />
                )}
              >
                <WorkoutExerciseCardDetails
                  chips={buildExerciseIdentityChips({
                    measurementType: item.measurementType,
                    isCardio: item.isCardio,
                    kind: item.kind,
                    type: item.type,
                    equipment: item.equipment,
                    movementPattern: item.movement_pattern,
                    primaryMuscle: item.primary_muscle,
                    tags: item.tags,
                    categories: item.categories,
                  })}
                />
              </StandardExerciseRow>

              {isActive && mode === "editable" && renderExpandedContent ? (
                <div id={panelId} data-testid={`day-detail-panel-${item.id}`} className="border-t border-border/30 px-3.5 pb-3.5 pt-2 sm:px-4">
                  {renderExpandedContent(item)}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
