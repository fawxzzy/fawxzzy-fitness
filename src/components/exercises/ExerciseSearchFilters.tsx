"use client";

import { useEffect, useMemo, useState } from "react";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME } from "@/components/ui/app/overlayPanelTokens";
import { appTokens } from "@/components/ui/app/tokens";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  dispatchFitnessOverlayExclusiveOpen,
  FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT,
  type FitnessOverlayExclusiveDetail,
} from "@/lib/fitness-overlay-mutual-exclusion";

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
  chromeVariant?: "default" | "history";
  filterViewportMode?: "scroll" | "auto-height";
  filterHorizontalRailOverrideClassName?: string;
  filterCompactDensity?: "default" | "tight";
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
  chromeVariant = "default",
  filterViewportMode = "scroll",
  filterHorizontalRailOverrideClassName,
  filterCompactDensity = "default",
}: ExerciseSearchFiltersProps) {
  void searchFirst;
  const [isFilterOpen, setIsFilterOpen] = useState(defaultFilterOpen);

  useEffect(() => {
    const handleExclusiveOverlayOpen = (event: Event) => {
      const payload = (event as CustomEvent<FitnessOverlayExclusiveDetail>).detail;
      if (payload?.source !== "info") {
        return;
      }

      setIsFilterOpen(false);
    };

    window.addEventListener(FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT, handleExclusiveOverlayOpen);
    return () => window.removeEventListener(FITNESS_OVERLAY_EXCLUSIVE_OPEN_EVENT, handleExclusiveOverlayOpen);
  }, []);

  const updateFilterOpen = (nextValue: boolean | ((previous: boolean) => boolean)) => {
    setIsFilterOpen((previous) => {
      const resolvedValue = typeof nextValue === "function" ? nextValue(previous) : nextValue;
      if (resolvedValue) {
        dispatchFitnessOverlayExclusiveOpen("filter");
      }
      return resolvedValue;
    });
  };

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
    <div className="relative w-full">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchPlaceholderText}
        className={cn(
          appTokens.exercisePickerSearchInput,
          query ? "pr-[10.1rem]" : "pr-[7.5rem]",
          searchInputClassName,
        )}
      />
      <div className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1">
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label={clearSearchAriaLabel}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full text-[rgb(var(--text-muted)/0.96)] transition-colors hover:bg-[rgb(var(--surface-2-rgb)/0.54)] hover:text-[rgb(var(--text-primary)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)]",
              clearButtonClassName,
            )}
          >
            &times;
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => updateFilterOpen((previous) => !previous)}
          aria-expanded={isFilterOpen}
          aria-label={toggleFiltersAriaLabel}
          data-action-chrome-intent={isFilterOpen || selectedFilterCount > 0 ? "toggleActive" : "neutral"}
          data-action-chrome-selected={isFilterOpen || selectedFilterCount > 0 ? "true" : undefined}
          className={cn(
            ACTION_CHROME_CONTROL_CLASS_NAME,
            ACTION_CHROME_SEGMENTED_CLASS_NAME,
            "inline-flex h-8 min-w-[3.55rem] items-center justify-center gap-1 rounded-[999px] px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] focus-visible:ring-[rgb(var(--accent)/0.22)]",
            chromeVariant === "history" && !(isFilterOpen || selectedFilterCount > 0)
              ? "border-transparent bg-transparent shadow-none text-[rgb(var(--text-muted)/0.96)]"
              : "",
          )}
        >
          <span>{selectedFilterCount > 0 ? selectedFilterCount : "Filter"}</span>
          {isFilterOpen ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );

  const filterControl = (
    <ExerciseTagFilterControl
      selectedTags={selectedTags}
      onChange={onTagsChange}
      groups={groups}
      defaultOpen={defaultFilterOpen}
      open={isFilterOpen}
      onOpenChange={updateFilterOpen}
      hideButton
      trailingMeta={filterTrailingMeta ?? (typeof resultCount === "number" ? `${resultCount} shown` : undefined)}
      headerLabel={filterLabel}
      className={filterClassName}
      buttonClassName={filterButtonClassName}
      panelClassName={filterPanelClassName}
      variant="compact"
      viewportMode={filterViewportMode}
      horizontalRailOverrideClassName={filterHorizontalRailOverrideClassName}
      compactDensity={filterCompactDensity}
    />
  );

  return (
    <div className={cn("relative", className)}>
      {searchControl}
      {isFilterOpen ? (
        <div className={cn("absolute left-1/2 top-[calc(100%+0.625rem)] z-60 -translate-x-1/2", SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME)}>
          {filterControl}
        </div>
      ) : null}
    </div>
  );
}
