"use client";

import { useMemo, useState } from "react";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export const DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME = "space-y-2.5";

type ExerciseSearchFiltersProps = {
  query: string;
  onQueryChange: (next: string) => void;
  selectedTags: string[];
  onTagsChange: (nextTags: string[]) => void;
  groups: ExerciseTagGroup[];
  resultCount?: number;
  filterLabel?: string;
  filterTrailingMeta?: string;
  searchFirst?: boolean;
  defaultFilterOpen?: boolean;
  className?: string;
  filterClassName?: string;
  filterButtonClassName?: string;
  filterPanelClassName?: string;
  searchInputClassName?: string;
  clearButtonClassName?: string;
  searchPlaceholder?: string;
  resultSingularLabel?: string;
  resultPluralLabel?: string;
  clearSearchAriaLabel?: string;
  toggleFiltersAriaLabel?: string;
};

export function ExerciseSearchFilters({
  query,
  onQueryChange,
  selectedTags,
  onTagsChange,
  groups,
  resultCount,
  filterLabel = "Filters",
  filterTrailingMeta,
  searchFirst = true,
  defaultFilterOpen = false,
  className = DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME,
  filterClassName = "space-y-1.5",
  filterButtonClassName,
  filterPanelClassName,
  searchInputClassName,
  clearButtonClassName,
  searchPlaceholder = "Search exercises",
  resultSingularLabel = "exercise",
  resultPluralLabel = "exercises",
  clearSearchAriaLabel = "Clear exercise search",
  toggleFiltersAriaLabel = "Toggle exercise filters",
}: ExerciseSearchFiltersProps) {
  void searchFirst;
  const [isFilterOpen, setIsFilterOpen] = useState(defaultFilterOpen);
  const selectedFilterCount = selectedTags.length;
  const searchPlaceholderText = useMemo(() => {
    if (typeof resultCount !== "number") {
      return searchPlaceholder.endsWith("..") ? searchPlaceholder : `${searchPlaceholder}..`;
    }

    const resultLabel = `${resultCount} ${resultCount === 1 ? resultSingularLabel : resultPluralLabel}`;
    const filterLabelText = selectedFilterCount > 0
      ? ` • ${selectedFilterCount} filter${selectedFilterCount === 1 ? "" : "s"}`
      : "";
    return `Search ${resultLabel}${filterLabelText}..`;
  }, [resultCount, resultPluralLabel, resultSingularLabel, searchPlaceholder, selectedFilterCount]);

  const searchControl = (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchPlaceholderText}
        className={cn(appTokens.exercisePickerSearchInput, "pr-[7.5rem]", searchInputClassName)}
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label={clearSearchAriaLabel}
          className={cn(appTokens.exercisePickerSearchClearButton, "right-[4.6rem]", clearButtonClassName)}
        >
          &times;
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setIsFilterOpen((previous) => !previous)}
        aria-expanded={isFilterOpen}
        aria-label={toggleFiltersAriaLabel}
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-8 min-w-[3.55rem] -translate-y-1/2 items-center justify-center gap-1 rounded-[999px] border px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)]",
          isFilterOpen || selectedFilterCount > 0
            ? "border-[rgb(var(--accent)/0.44)] bg-[rgb(var(--accent)/0.18)] text-[rgb(var(--accent)/0.96)]"
            : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.78)] text-[rgb(var(--text-muted)/0.96)]",
        )}
      >
        <span>{selectedFilterCount > 0 ? selectedFilterCount : "Filter"}</span>
        {isFilterOpen ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );

  const filterControl = (
    <ExerciseTagFilterControl
      selectedTags={selectedTags}
      onChange={onTagsChange}
      groups={groups}
      defaultOpen={defaultFilterOpen}
      open={isFilterOpen}
      onOpenChange={setIsFilterOpen}
      hideButton
      trailingMeta={filterTrailingMeta ?? (typeof resultCount === "number" ? `${resultCount} shown` : undefined)}
      headerLabel={filterLabel}
      className={filterClassName}
      buttonClassName={filterButtonClassName}
      panelClassName={filterPanelClassName}
      variant="compact"
    />
  );

  return (
    <div className={className}>
      {searchControl}
      {isFilterOpen ? filterControl : null}
    </div>
  );
}
