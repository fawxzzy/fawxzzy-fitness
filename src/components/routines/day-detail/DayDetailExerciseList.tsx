"use client";

import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { cn } from "@/lib/cn";

export type DayDetailExerciseListItem = {
  id: string;
  name: string;
  summary: string | null;
  iconSrc: string;
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
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const isActive = activeItemId === item.id;
        return (
          <li key={item.id} className="rounded-[1.3rem] transition-all">
            <div className="overflow-hidden rounded-[1.25rem]">
              <StandardExerciseRow
                exercise={{ name: item.name, image_icon_path: item.iconSrc }}
                summary={item.summary ?? undefined}
                variant="interactive"
                state={isActive && mode === "editable" ? "selected" : "default"}
                onPress={interactive ? () => onSelectItem?.(item) : undefined}
                badgeText={mode === "editable" ? `#${index + 1}` : undefined}
                trailingClassName="self-start pt-0.5"
                className={cn(
                  listShellClasses.card,
                  "w-full",
                  isActive && mode === "editable" ? "rounded-b-none" : undefined,
                )}
                rightIcon={<span aria-hidden="true" className="pt-0.5 text-muted">›</span>}
              />

              {isActive && mode === "editable" && renderExpandedContent ? (
                <div className="border-t border-border/30 px-3.5 pb-3.5 pt-2 sm:px-4">
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
