"use client";

import { useMemo, useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { PillButton } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

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
};

function formatTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

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
}: ExerciseTagFilterControlProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const selectedSummary = useMemo(() => {
    if (selectedTags.length === 0) return "No filters active";

    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    const labels = selectedTags.map((tag) => labelByValue.get(tag) ?? formatTagLabel(tag));
    return `${selectedTags.length} selected \u00b7 ${labels.join(", ")}`;
  }, [groups, selectedTags]);

  const compact = variant === "compact";

  return (
    <div className={className ?? "space-y-2"}>
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

      {compact || !(countDisplayMode === "always" || (countDisplayMode === "whenNonZero" && selectedTags.length > 0)) ? null : (
        <p className={cn("text-xs text-muted", summaryClassName)}>
          {selectedSummary}
        </p>
      )}

      {isOpen ? (
        <div className={cn(compact ? appTokens.exercisePickerFilterPanel : "space-y-2", panelClassName)}>
          {groups.map((group) => (
            <div key={group.key} className={compact ? "space-y-1.5" : "space-y-1"}>
              <p className={cn(compact ? appTokens.exercisePickerFilterGroupLabel : "text-[11px] font-medium uppercase tracking-wide text-muted", "pl-[4px] pt-[4px]")}>{group.label}</p>
              <div className={cn("hide-scrollbar -mx-0.5 overflow-x-auto px-0.5 pb-1", compact ? "pt-0.5" : undefined)}>
                <div className={compact ? "flex min-w-max flex-nowrap gap-1.5" : "flex min-w-max flex-nowrap gap-1"}>
                  {[...group.tags].sort((left, right) => {
                    const leftSelected = selectedTags.includes(left.value);
                    const rightSelected = selectedTags.includes(right.value);
                    if (leftSelected === rightSelected) return 0;
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
