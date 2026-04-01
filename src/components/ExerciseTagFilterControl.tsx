"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { PillButton } from "@/components/ui/Pill";

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
}: ExerciseTagFilterControlProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const selectedSummary = useMemo(() => {
    if (selectedTags.length === 0) return "No filters active";

    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    const labels = selectedTags.map((tag) => labelByValue.get(tag) ?? formatTagLabel(tag));
    return `${selectedTags.length} selected · ${labels.join(", ")}`;
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
        className={compact
          ? "min-h-10 w-full justify-between rounded-lg border border-border/45 bg-[rgb(var(--bg)/0.18)] px-3 py-2 text-sm font-medium [-webkit-tap-highlight-color:transparent]"
          : "w-full justify-between border border-white/10 bg-black/10 [-webkit-tap-highlight-color:transparent]"}
      >
        <span className="inline-flex items-center gap-2">
          <span>{headerLabel}</span>
          <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.45)] px-1.5 text-[11px] font-semibold text-muted">
            {selectedTags.length}
          </span>
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          {compact && selectedTags.length > 0 ? <span className="text-[11px] font-medium text-muted">Active</span> : null}
          {isOpen ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
        </span>
      </Button>

      {shouldShowSummary ? <p className={compact ? "px-1 text-[11px] text-muted" : "text-xs text-muted"}>{selectedSummary}</p> : null}

      {isOpen ? (
        <div className={compact ? "space-y-2 rounded-lg border border-border/35 bg-[rgb(var(--bg)/0.16)] p-2.5" : "space-y-2"}>
          <div className="flex items-center justify-end">
            {selectedTags.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex min-h-7 items-center rounded-full border border-border/45 bg-[rgb(var(--bg)/0.35)] px-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted transition-colors hover:text-text"
              >
                Clear
              </button>
            ) : null}
          </div>
          {groups.map((group) => (
            <div key={group.key} className={compact ? "space-y-1.5" : "space-y-1"}>
              <p className={compact ? "text-[10px] font-medium uppercase tracking-[0.14em] text-muted/80" : "text-[11px] font-medium uppercase tracking-wide text-muted"}>{group.label}</p>
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
