"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { FilterToggleButton } from "@/components/ui/FilterToggleButton";
import { SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME } from "@/components/ui/app/overlayPanelTokens";
import { appTokens } from "@/components/ui/app/tokens";
import { Input } from "@/components/ui/Input";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { PillButton } from "@/components/ui/Pill";
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
  trailingControls?: ReactNode;
  filterExtraContent?: ReactNode;
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
  trailingControls,
  filterExtraContent,
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
  const selectedTagEntries = useMemo(() => {
    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    return selectedTags.map((tag) => ({
      value: tag,
      label: labelByValue.get(tag) ?? tag,
    }));
  }, [groups, selectedTags]);
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
          trailingControls
            ? (query ? "pr-[18.5rem]" : "pr-[16rem]")
            : (query ? "pr-[10.1rem]" : "pr-[7.5rem]"),
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
        {trailingControls}
        <FilterToggleButton
          open={isFilterOpen}
          active={selectedFilterCount > 0}
          onClick={() => updateFilterOpen((previous) => !previous)}
          ariaLabel={toggleFiltersAriaLabel}
          countBadge={selectedFilterCount > 0 ? selectedFilterCount : null}
          className={cn(
            chromeVariant === "history" && !(isFilterOpen || selectedFilterCount > 0)
              ? "border-transparent bg-transparent shadow-none"
              : "",
            filterButtonClassName,
          )}
        />
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
      autoHeightViewportClassName={
        filterViewportMode === "auto-height"
          ? "max-h-[calc(100dvh-var(--bottom-actions-height,var(--app-mobile-bottom-dock-height,0px))-11.5rem)]"
          : undefined
      }
      horizontalRailOverrideClassName={filterHorizontalRailOverrideClassName}
      compactDensity={filterCompactDensity}
      extraContent={filterExtraContent}
    />
  );
  const activeFilterRail = selectedTagEntries.length > 0 && !isFilterOpen ? (
    <div className="space-y-0.5 px-0.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className={appTokens.exercisePickerFilterGroupLabel}>Active Filters</p>
        <button
          type="button"
          onClick={() => onTagsChange([])}
          className={cn(appTokens.exercisePickerFilterClearButton, "!border-[rgb(var(--accent-yellow-on)/0.58)] px-2 py-1 text-[10px]")}
        >
          Clear all
        </button>
      </div>
      <HorizontalScrollHint
        scrollClassName="hide-scrollbar -mx-0.5 overflow-x-auto overflow-y-visible px-0.5 pb-0.5 [touch-action:pan-x] [-webkit-overflow-scrolling:touch]"
        contentClassName="flex min-w-max flex-nowrap gap-1.5"
      >
        {selectedTagEntries.map((tag) => (
          <PillButton
            key={tag.value}
            type="button"
            active
            className="shrink-0 whitespace-nowrap px-2 py-1 text-[10px] !border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            onClick={() => onTagsChange(selectedTags.filter((value) => value !== tag.value))}
          >
            {tag.label}
          </PillButton>
        ))}
      </HorizontalScrollHint>
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      {searchControl}
      {activeFilterRail}
      {isFilterOpen ? (
        <div className={cn("absolute left-1/2 top-[calc(100%+0.625rem)] z-[96] -translate-x-1/2", SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME)}>
          {filterControl}
        </div>
      ) : null}
    </div>
  );
}
