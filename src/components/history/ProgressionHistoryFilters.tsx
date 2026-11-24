"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { HistoryFilterBar, type HistoryActiveFilterChip, type HistoryFilterGroup } from "@/components/history/HistoryFilterBar";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import type { ProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import { serializeProgressionHistoryFilters, type ProgressionHistoryFilters as Filters } from "@/lib/progression-history-filters";

/**
 * Progression filters (History redesign 2026-11-23, review item 10): the same Filters button + sheet as Sessions
 * and Exercises instead of an always-open form with native selects. Filters still live in the URL
 * (`serializeProgressionHistoryFilters`), so the server keeps doing the filtering and links stay shareable; each
 * tap replaces the URL and the ledger re-renders under the open sheet.
 */
export function ProgressionHistoryFilters({
  filters,
  filterOptions,
  filteredEventCount,
}: Pick<ProgressionHistoryDisplayModel, "filters" | "filterOptions" | "filteredEventCount">) {
  const router = useRouter();
  const pathname = usePathname() ?? "/history/progression";
  const [isPending, startTransition] = useTransition();

  const apply = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch } as Filters;
    const search = serializeProgressionHistoryFilters(next).toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  };

  const groups: HistoryFilterGroup[] = [
    {
      key: "eventType",
      title: "Change",
      options: filterOptions.eventTypes.map((option) => ({
        key: option.value,
        label: option.label,
        selected: filters.eventType === option.value,
        onSelect: () => apply({ eventType: filters.eventType === option.value ? null : option.value as Filters["eventType"] }),
      })),
    },
    {
      key: "routine",
      title: "Routine",
      options: filterOptions.routines.map((option) => ({
        key: option.value,
        label: option.label,
        selected: filters.routineId === option.value,
        onSelect: () => apply({ routineId: filters.routineId === option.value ? null : option.value }),
      })),
    },
    {
      key: "exercise",
      title: "Exercise",
      collapsedLimit: 10,
      options: filterOptions.exercises.map((option) => ({
        key: option.value,
        label: option.label,
        selected: filters.exerciseId === option.value,
        onSelect: () => apply({ exerciseId: filters.exerciseId === option.value ? null : option.value }),
      })),
    },
  ].filter((group) => group.options.length > 0);

  const labelFor = (options: { value: string; label: string }[], value: string | null) => (
    value ? options.find((option) => option.value === value)?.label ?? null : null
  );
  const activeChips: HistoryActiveFilterChip[] = [];
  const eventLabel = labelFor(filterOptions.eventTypes, filters.eventType);
  if (eventLabel) activeChips.push({ key: "eventType", label: eventLabel, onRemove: () => apply({ eventType: null }) });
  const routineLabel = labelFor(filterOptions.routines, filters.routineId);
  if (routineLabel) activeChips.push({ key: "routine", label: routineLabel, onRemove: () => apply({ routineId: null }) });
  const exerciseLabel = labelFor(filterOptions.exercises, filters.exerciseId);
  if (exerciseLabel) activeChips.push({ key: "exercise", label: exerciseLabel, onRemove: () => apply({ exerciseId: null }) });
  if (filters.dateFrom) activeChips.push({ key: "dateFrom", label: `From ${filters.dateFrom}`, onRemove: () => apply({ dateFrom: null }) });
  if (filters.dateTo) activeChips.push({ key: "dateTo", label: `To ${filters.dateTo}`, onRemove: () => apply({ dateTo: null }) });

  return (
    <div data-progression-filters="true" aria-busy={isPending || undefined}>
      <HistoryFilterBar
        activeFilterCount={activeChips.length}
        activeChips={activeChips}
        onClearAll={() => apply({ eventType: null, routineId: null, exerciseId: null, dateFrom: null, dateTo: null })}
        groups={groups}
        resultCount={filteredEventCount}
        resultSingularLabel="change"
        resultPluralLabel="changes"
        sheetExtra={(
          <section className="grid gap-2" data-history-filter-group="dates">
            <h3 className="px-1 text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-[rgb(var(--text-secondary)/0.92)]">Dates</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="From">
                {(control) => (
                  <input
                    {...control}
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom ?? ""}
                    max={filters.dateTo ?? undefined}
                    onChange={(event) => apply({ dateFrom: event.target.value || null })}
                    className={formFieldControlClassName}
                  />
                )}
              </FormField>
              <FormField label="To">
                {(control) => (
                  <input
                    {...control}
                    type="date"
                    name="dateTo"
                    value={filters.dateTo ?? ""}
                    min={filters.dateFrom ?? undefined}
                    onChange={(event) => apply({ dateTo: event.target.value || null })}
                    className={formFieldControlClassName}
                  />
                )}
              </FormField>
            </div>
          </section>
        )}
      />
    </div>
  );
}
