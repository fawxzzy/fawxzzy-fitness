"use client";

import { useId, useState, type ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formFieldShellClassName, formFieldControlClassName } from "@/components/ui/FormField";
import { cn } from "@/lib/cn";

/**
 * History filter bar (History redesign 2026-11-23).
 *
 * One opaque sticky row: a full-width search field and ONE "Filters" button that opens a bottom sheet. Picked
 * filters show as removable chips under the row, so nothing scrolls sideways and nothing is clipped (History
 * review items 1, 5 and 15). The sheet lists every group as wrapped chips; its footer clears all or closes with
 * the live result count.
 */

export type HistoryFilterOption = {
  key: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export type HistoryFilterGroup = {
  key: string;
  title: string;
  options: HistoryFilterOption[];
  /** Show only this many options until "Show all" is tapped (long lists such as session dates). */
  collapsedLimit?: number;
};

export type HistoryActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

const CHIP_BASE_CLASS_NAME = "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border px-3.5 text-left text-sm font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.4)]";
const CHIP_IDLE_CLASS_NAME = "!border-[rgb(var(--border-strong)/0.2)] !bg-[rgb(var(--surface-2-rgb)/0.5)] !text-[rgb(var(--text-secondary))]";
const CHIP_SELECTED_CLASS_NAME = "!border-[rgb(var(--accent)/0.72)] !bg-[rgb(var(--accent)/0.22)] !text-[rgb(var(--text-primary))]";

function formatResultCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function HistoryFilterChip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(CHIP_BASE_CLASS_NAME, selected ? CHIP_SELECTED_CLASS_NAME : CHIP_IDLE_CLASS_NAME)}
    >
      {selected ? <span aria-hidden="true">✓</span> : null}
      <span className="min-w-0 break-words">{label}</span>
    </button>
  );
}

function HistoryFilterGroupSection({ group }: { group: HistoryFilterGroup }) {
  const headingId = useId();
  const [showAll, setShowAll] = useState(false);
  const limit = group.collapsedLimit ?? 0;
  const selectedOutsideLimit = limit > 0 && group.options.slice(limit).some((option) => option.selected);
  const isCollapsed = limit > 0 && group.options.length > limit && !showAll && !selectedOutsideLimit;
  const visibleOptions = isCollapsed ? group.options.slice(0, limit) : group.options;

  return (
    <section aria-labelledby={headingId} data-history-filter-group={group.key} className="grid gap-2">
      <h3 id={headingId} className="px-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[rgb(var(--text-secondary)/0.92)]">
        {group.title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => (
          <HistoryFilterChip key={option.key} label={option.label} selected={option.selected} onSelect={option.onSelect} />
        ))}
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={cn(CHIP_BASE_CLASS_NAME, "!border-dashed", CHIP_IDLE_CLASS_NAME)}
          >
            Show all {group.options.length}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function HistoryFilterBar({
  query,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  activeFilterCount,
  activeChips,
  onClearAll,
  groups,
  resultCount,
  resultSingularLabel,
  resultPluralLabel,
  sheetTitle = "Filters",
  initialSheetOpen = false,
  sheetExtra,
}: {
  /** Omit `query` for screens without a text search (Progression): the Filters button then stands alone. */
  query?: string;
  onQueryChange?: (next: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  activeFilterCount: number;
  activeChips: HistoryActiveFilterChip[];
  onClearAll: () => void;
  groups: HistoryFilterGroup[];
  resultCount: number;
  resultSingularLabel: string;
  resultPluralLabel: string;
  sheetTitle?: string;
  initialSheetOpen?: boolean;
  /** Extra controls at the end of the sheet (Progression date range). */
  sheetExtra?: ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(initialSheetOpen);
  const searchId = useId();
  const resultLabel = formatResultCount(resultCount, resultSingularLabel, resultPluralLabel);
  const hasSearch = typeof query === "string" && Boolean(onQueryChange);
  const hasAnyFilter = activeFilterCount > 0 || (query ?? "").trim().length > 0;

  return (
    <div data-history-filter-bar="true" className="grid gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {hasSearch ? (
        <div className={cn(formFieldShellClassName, "flex min-w-0 flex-1 items-center")}>
          <label htmlFor={searchId} className="sr-only">{searchLabel ?? "Search"}</label>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-3 h-4 w-4 shrink-0 text-[rgb(var(--text-muted))]" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.2 13.2 3.3 3.3" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className={cn(formFieldControlClassName, "pl-2 [&::-webkit-search-cancel-button]:hidden")}
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange?.("")}
              aria-label={`Clear ${(searchLabel ?? "search").toLowerCase()}`}
              className="mr-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full !border-0 !bg-transparent text-lg leading-none !text-[rgb(var(--text-muted))]"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
        ) : null}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} on` : "Filters"}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.4)]",
            activeFilterCount > 0 ? CHIP_SELECTED_CLASS_NAME : CHIP_IDLE_CLASS_NAME,
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3.5 6h13M6 10h8M8.5 14h3" />
          </svg>
          <span>Filters</span>
          {activeFilterCount > 0 ? (
            <span aria-hidden="true" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--accent))] px-1.5 text-[11px] font-bold leading-none text-[rgb(var(--surface-rgb))]">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {activeChips.length > 0 ? (
        <ul aria-label="Filters on" className="flex flex-wrap gap-2">
          {activeChips.map((chip) => (
            <li key={chip.key} className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className={cn(CHIP_BASE_CLASS_NAME, CHIP_SELECTED_CLASS_NAME)}
              >
                <span className="min-w-0 break-words">{chip.label}</span>
                <span aria-hidden="true" className="text-base leading-none text-[rgb(var(--text-muted))]">×</span>
              </button>
            </li>
          ))}
          {activeChips.length > 1 ? (
            <li>
              <button
                type="button"
                onClick={onClearAll}
                className={cn(CHIP_BASE_CLASS_NAME, "!border-transparent !bg-transparent !text-[rgb(var(--accent))]")}
              >
                Clear all
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="sr-only" aria-live="polite">{resultLabel}</p>

      <BottomSheet
        open={sheetOpen}
        title={sheetTitle}
        description={`Showing ${resultLabel}`}
        onClose={() => setSheetOpen(false)}
        contentClassName="!pb-0"
      >
        <div className="grid gap-5 pb-4">
          {groups.length > 0 ? (
            groups.map((group) => <HistoryFilterGroupSection key={group.key} group={group} />)
          ) : (
            <p className="px-1 text-sm text-[rgb(var(--text-muted))]">No filters yet. They appear once you log workouts.</p>
          )}
          {sheetExtra}
        </div>
        <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb))] px-4 pb-[max(1rem,var(--app-safe-bottom))] pt-3">
          <AppButton type="button" variant="secondary" size="sm" disabled={!hasAnyFilter} onClick={onClearAll}>
            Clear all
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" onClick={() => setSheetOpen(false)}>
            Show {resultLabel}
          </AppButton>
        </div>
      </BottomSheet>
    </div>
  );
}
