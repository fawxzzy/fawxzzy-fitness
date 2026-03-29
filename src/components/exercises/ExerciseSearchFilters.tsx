"use client";

import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { Input } from "@/components/ui/Input";

type ExerciseSearchFiltersProps = {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (nextTags: string[]) => void;
  groups: ExerciseTagGroup[];
  className?: string;
  filterClassName?: string;
};

export function ExerciseSearchFilters({
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  groups,
  className = "space-y-2",
  filterClassName = "space-y-1.5",
}: ExerciseSearchFiltersProps) {
  return (
    <div className={className}>
      <div className="relative">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search exercises" className="pr-9" />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear exercise search"
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
          >
            ×
          </button>
        ) : null}
      </div>
      <ExerciseTagFilterControl
        selectedTags={selectedTags}
        onChange={onTagsChange}
        groups={groups}
        className={filterClassName}
        variant="compact"
      />
    </div>
  );
}
