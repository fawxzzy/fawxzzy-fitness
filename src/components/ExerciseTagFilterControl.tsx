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

  const shouldShowSummary =
    countDisplayMode === "always" || (countDisplayMode === "whenNonZero" && selectedTags.length > 0);

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
        <span className="inline-flex items-center gap-2">
          <span>{headerLabel}</span>
          <span className={appTokens.exercisePickerFilterCountBadge}>
            {selectedTags.length}
          </span>
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          {compact && selectedTags.length > 0 ? <span className="text-[11px] font-medium text-muted">Active</span> : null}
          {isOpen ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
        </span>
      </Button>

      {shouldShowSummary ? (
        <p className={cn(compact ? appTokens.exercisePickerFilterSummary : "text-xs text-muted", summaryClassName)}>
          {selectedSummary}
        </p>
      ) : null}

      {isOpen ? (
        <div className={cn(compact ? appTokens.exercisePickerFilterPanel : "space-y-2", panelClassName)}>
          <div className="flex items-center justify-end">
            {selectedTags.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className={appTokens.exercisePickerFilterClearButton}
              >
                Clear
              </button>
            ) : null}
          </div>
          {groups.map((group) => (
            <div key={group.key} className={compact ? "space-y-1.5" : "space-y-1"}>
              <p className={compact ? appTokens.exercisePickerFilterGroupLabel : "text-[11px] font-medium uppercase tracking-wide text-muted"}>{group.label}</p>
              <div className={compact
                ? "flex flex-wrap gap-1.5 px-0.5 py-0.5"
                : "flex flex-wrap gap-1 px-0.5 py-0.5"}
              >
                {group.tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.value);
                  return (
                    <PillButton
                      key={tag.value}
                      type="button"
                      active={isSelected}
                      className={cn(
                        "max-w-full justify-start whitespace-normal text-left leading-tight [word-break:normal]",
                        compact ? "px-2 py-1 text-[10px]" : undefined,
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
          ))}
        </div>
      ) : null}
    </div>
  );
}
