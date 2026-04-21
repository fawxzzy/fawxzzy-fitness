"use client";

import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { appTokens } from "@/components/ui/app/tokens";
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
        className={filterClassName}
        variant="compact"
      />
    </div>
  );
}
