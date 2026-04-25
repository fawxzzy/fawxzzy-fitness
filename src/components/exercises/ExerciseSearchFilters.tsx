"use client";

import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type ExerciseSearchFiltersProps = {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (nextTags: string[]) => void;
  groups: ExerciseTagGroup[];
  resultCount?: number;
  className?: string;
  filterClassName?: string;
};

export function ExerciseSearchFilters({
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  groups,
  resultCount,
  className = "space-y-2",
  filterClassName = "space-y-1.5",
}: ExerciseSearchFiltersProps) {
  return (
    <div className={className}>
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search exercises"
          className={cn(appTokens.exercisePickerSearchInput)}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear exercise search"
            className={appTokens.exercisePickerSearchClearButton}
          >
            &times;
          </button>
        ) : null}
      </div>
      <ExerciseTagFilterControl
        selectedTags={selectedTags}
        onChange={onTagsChange}
        groups={groups}
        trailingMeta={typeof resultCount === "number" ? `${resultCount} shown` : undefined}
        className={filterClassName}
        variant="compact"
      />
    </div>
  );
}
