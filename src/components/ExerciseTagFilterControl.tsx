"use client";

import { useMemo, useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { PillButton } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import { formatExerciseTagLabel } from "@/lib/exercise-curation";

export type ExerciseTagGroup = {
  key: string;
  label: string;
  tags: Array<{ value: string; label: string }>;
};

type ExerciseTagFilterControlProps = {
  selectedTags: string[];
  onChange: (nextTags: string[]) => void;
  groups: ExerciseTagGroup[];
  countDisplayMode?: "never" | "whenNonZero" | "always";
  defaultOpen?: boolean;
  headerLabel?: string;
  trailingMeta?: string;
  className?: string;
  variant?: "default" | "compact";
  buttonClassName?: string;
  panelClassName?: string;
  summaryClassName?: string;
  open?: boolean;
  onOpenChange?: (nextValue: boolean) => void;
  hideButton?: boolean;
};

export function ExerciseTagFilterControl({
  selectedTags,
  onChange,
  groups,
  countDisplayMode = "whenNonZero",
  defaultOpen = false,
  headerLabel = "Filters",
  trailingMeta,
  className,
  variant = "default",
  buttonClassName,
  panelClassName,
  summaryClassName,
  open,
  onOpenChange,
  hideButton = false,
}: ExerciseTagFilterControlProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const isOpen = typeof open === "boolean" ? open : uncontrolledIsOpen;

  const setIsOpen = (nextValue: boolean | ((previous: boolean) => boolean)) => {
    const resolvedValue = typeof nextValue === "function" ? nextValue(isOpen) : nextValue;
    if (typeof open !== "boolean") {
      setUncontrolledIsOpen(resolvedValue);
    }
    onOpenChange?.(resolvedValue);
  };

  const selectedSummary = useMemo(() => {
    if (selectedTags.length === 0) return "No filters active";

    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    const labels = selectedTags.map((tag) => labelByValue.get(tag) ?? formatExerciseTagLabel(tag));
    return `${selectedTags.length} selected \u00b7 ${labels.join(", ")}`;
  }, [groups, selectedTags]);

  const compact = variant === "compact";

  return (
    <div className={className ?? "space-y-2"}>
      {hideButton ? null : (
        <Button
          type="button"
          variant={compact ? "secondary" : "ghost"}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className={cn(
            compact
              ? appTokens.exercisePickerFilterToggle
              : "w-full justify-between rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.54)] [-webkit-tap-highlight-color:transparent]",
            buttonClassName,
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <span>{headerLabel}</span>
          </span>
          <span className="ml-auto inline-flex min-w-0 items-center gap-2 pl-2">
            {trailingMeta ? (
              <span className={cn(appTokens.exercisePickerSectionMeta, selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.96)]" : undefined)}>
                {trailingMeta}
              </span>
            ) : null}
            {isOpen ? (
              <ChevronUpIcon className={cn("h-4 w-4", selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.92)]" : "text-muted")} />
            ) : (
              <ChevronDownIcon className={cn("h-4 w-4", selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.92)]" : "text-muted")} />
            )}
          </span>
        </Button>
      )}

      {compact || hideButton || !(countDisplayMode === "always" || (countDisplayMode === "whenNonZero" && selectedTags.length > 0)) ? null : (
        <p className={cn("text-xs text-muted", summaryClassName)}>
          {selectedSummary}
        </p>
      )}

      {isOpen ? (
        <div className={cn(compact ? appTokens.exercisePickerFilterPanel : "space-y-2", panelClassName)}>
          <div className="relative overflow-hidden rounded-[0.95rem]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-5 bg-gradient-to-b from-[rgb(var(--surface-1-rgb)/0.86)] via-[rgb(var(--surface-1-rgb)/0.42)] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-7 bg-gradient-to-t from-[rgb(var(--surface-1-rgb)/0.92)] via-[rgb(var(--surface-1-rgb)/0.56)] to-transparent" />
            <div
              className={cn(
                "filter-scroll-viewport overflow-y-auto overscroll-contain touch-pan-y py-1 pr-1",
                compact ? "max-h-[min(42vh,20rem)] space-y-3" : "max-h-[min(48vh,24rem)] space-y-2",
              )}
            >
              {groups.map((group) => (
                <div key={group.key} className={compact ? "space-y-1.5" : "space-y-1"}>
                  <p className={cn(compact ? appTokens.exercisePickerFilterGroupLabel : "text-[11px] font-medium uppercase tracking-wide text-muted", "pl-[4px] pt-[4px]")}>{group.label}</p>
                  <div className={cn("hide-scrollbar -mx-0.5 overflow-x-auto px-0.5 pb-1", compact ? "pt-0.5" : undefined)}>
                    <div className={compact ? "flex min-w-max flex-nowrap gap-1.5" : "flex min-w-max flex-nowrap gap-1"}>
                      {[...group.tags].sort((left, right) => {
                        const leftSelected = selectedTags.includes(left.value);
                        const rightSelected = selectedTags.includes(right.value);
                        if (leftSelected === rightSelected) return left.label.localeCompare(right.label);
                        return leftSelected ? -1 : 1;
                      }).map((tag) => {
                        const isSelected = selectedTags.includes(tag.value);
                        return (
                          <PillButton
                            key={tag.value}
                            type="button"
                            active={isSelected}
                            className={cn(
                              "max-w-full shrink-0 justify-start whitespace-nowrap text-left leading-tight [word-break:normal]",
                              compact ? "px-2 py-1 text-[10px]" : undefined,
                              isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                            )}
                            onClick={() => {
                              if (isSelected) {
                                onChange(selectedTags.filter((value) => value !== tag.value));
                                return;
                              }

                              onChange([...selectedTags, tag.value]);
                            }}
                          >
                            {tag.label}
                          </PillButton>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {selectedTags.length > 0 ? (
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className={appTokens.exercisePickerFilterClearButton}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
