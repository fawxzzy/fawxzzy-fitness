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
  className?: string;
};

function formatTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function ExerciseTagFilterControl({ selectedTags, onChange, groups, className }: ExerciseTagFilterControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSummary = useMemo(() => {
    if (selectedTags.length === 0) return "All";

    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    const labels = selectedTags.map((tag) => labelByValue.get(tag) ?? formatTagLabel(tag));
    return `${selectedTags.length} selected · ${labels.join(", ")}`;
  }, [groups, selectedTags]);

  return (
    <div className={className ?? "space-y-2 rounded-md border border-border/70 bg-[rgb(var(--bg)/0.28)] p-2.5"}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full justify-between border border-border/60 bg-[rgb(var(--bg)/0.4)] [-webkit-tap-highlight-color:transparent]"
      >
        <span>Filters</span>
        <span className="ml-auto inline-flex items-center">
          {isOpen ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
        </span>
      </Button>

      {selectedTags.length > 0 ? <p className="text-xs text-muted">{selectedSummary}</p> : null}

      {isOpen ? (
        <div className="space-y-2">
          <PillButton type="button" active={selectedTags.length === 0} onClick={() => onChange([])}>
            All
          </PillButton>
          {groups.map((group) => (
            <div key={group.key} className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{group.label}</p>
              <div className="flex gap-1 overflow-x-auto px-0.5 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
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
