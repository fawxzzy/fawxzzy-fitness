"use client";

import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseCard } from "@/components/ExerciseCard";
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
            <div
              className={cn(
                "overflow-hidden rounded-[1.25rem] border transition-colors",
                isActive && mode === "editable"
                  ? "border-emerald-400/40 bg-[linear-gradient(180deg,rgba(96,200,130,0.08),rgba(var(--surface-2-soft)/0.78))] shadow-[0_18px_38px_-28px_rgba(96,200,130,0.55)]"
                  : "border-border/45 bg-[rgb(var(--surface-2-soft)/0.28)]",
              )}
            >
              <ExerciseCard
                title={item.name}
                subtitle={item.summary ?? undefined}
                variant="interactive"
                state={isActive && mode === "editable" ? "selected" : "default"}
                onPress={interactive ? () => onSelectItem?.(item) : undefined}
                badgeText={mode === "editable" ? `#${index + 1}` : undefined}
                leadingVisual={(
                  <ExerciseAssetImage
                    src={item.iconSrc}
                    alt={`${item.name} icon`}
                    className="h-full w-full"
                    imageClassName="object-cover object-center"
                    sizes="44px"
                  />
                )}
                trailingClassName="self-start pt-0.5"
                className={cn(
                  listShellClasses.card,
                  "w-full rounded-[1.25rem] border-0 bg-transparent px-3.5 py-3.5 shadow-none",
                  isActive && mode === "editable" ? "rounded-b-none pb-2" : undefined,
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
