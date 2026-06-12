"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import {
  SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME,
} from "@/components/ui/app/overlayPanelTokens";
import { Button } from "@/components/ui/Button";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { FilterScrollPanel } from "@/components/ui/FilterScrollPanel";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { PillButton } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import {
  clearGroupBySelection,
  hasActiveGroupBySelection,
  orderGroupByOptions,
  toggleGroupBySelection,
} from "@/lib/exercise-tag-filter-order";
import { formatExerciseTagLabel } from "@/lib/exercise-curation";

const FILTER_OVERLAY_VIEWPORT_CLASS_NAME = "max-h-[min(66dvh,44rem)] space-y-2.5";

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
  trailingMeta?: string;
  className?: string;
  variant?: "default" | "compact";
  buttonClassName?: string;
  panelClassName?: string;
  summaryClassName?: string;
  open?: boolean;
  onOpenChange?: (nextValue: boolean) => void;
  hideButton?: boolean;
  tagLayout?: "horizontal" | "stacked";
  showScrollEdgeFades?: boolean;
  viewportMode?: "scroll" | "auto-height";
  horizontalRailOverrideClassName?: string;
  compactDensity?: "default" | "tight";
  extraContent?: ReactNode;
};

export function ExerciseTagFilterControl({
  selectedTags,
  onChange,
  groups,
  countDisplayMode = "whenNonZero",
  defaultOpen = false,
  headerLabel = "Filters",
  trailingMeta,
  className,
  variant = "default",
  buttonClassName,
  panelClassName,
  summaryClassName,
  open,
  onOpenChange,
  hideButton = false,
  tagLayout = "horizontal",
  showScrollEdgeFades = false,
  viewportMode = "scroll",
  horizontalRailOverrideClassName,
  compactDensity = "default",
  extraContent,
}: ExerciseTagFilterControlProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const isOpen = typeof open === "boolean" ? open : uncontrolledIsOpen;

  const setIsOpen = (nextValue: boolean | ((previous: boolean) => boolean)) => {
    const resolvedValue = typeof nextValue === "function" ? nextValue(isOpen) : nextValue;
    if (typeof open !== "boolean") {
      setUncontrolledIsOpen(resolvedValue);
    }
    onOpenChange?.(resolvedValue);
  };

  const selectedSummary = useMemo(() => {
    if (selectedTags.length === 0) return "No filters active";

    const labelByValue = new Map(groups.flatMap((group) => group.tags.map((tag) => [tag.value, tag.label] as const)));
    const labels = selectedTags.map((tag) => labelByValue.get(tag) ?? formatExerciseTagLabel(tag));
    return `${selectedTags.length} selected \u00b7 ${labels.join(", ")}`;
  }, [groups, selectedTags]);

  const groupByOptions = useMemo(
    () => orderGroupByOptions(groups.map((group) => ({ key: group.key, label: group.label })), selectedGroupKeys),
    [groups, selectedGroupKeys],
  );
  const showGroupByClearButton = hasActiveGroupBySelection(selectedGroupKeys);

  const orderedGroups = useMemo(() => {
    if (selectedGroupKeys.length === 0) {
      return groups;
    }
    const selectedKeySet = new Set(selectedGroupKeys);
    return selectedGroupKeys
      .map((selectedGroupKey) => groups.find((group) => group.key === selectedGroupKey))
      .filter((group): group is ExerciseTagGroup => Boolean(group))
      .filter((group) => selectedKeySet.has(group.key));
  }, [groups, selectedGroupKeys]);

  useEffect(() => {
    if (selectedGroupKeys.length === 0) {
      return;
    }

    const validGroupKeys = new Set(groups.map((group) => group.key));
    setSelectedGroupKeys((current) => {
      const next = current.filter((groupKey) => validGroupKeys.has(groupKey));
      return next.length === current.length ? current : next;
    });
  }, [groups, selectedGroupKeys.length]);

  const compact = variant === "compact";
  const useTightCompactDensity = compact && compactDensity === "tight";
  const useStackedTagLayout = tagLayout === "stacked";
  const horizontalRailClassName = compact
    ? "hide-scrollbar -mx-1 max-w-none overflow-x-auto overflow-y-visible px-1 pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]"
    : "hide-scrollbar -mx-0.5 max-w-full overflow-x-auto overflow-y-visible px-0.5 pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]";
  const compactSectionStackClassName = useTightCompactDensity ? "space-y-1" : "space-y-1.5";
  const compactHeaderWrapClassName = useTightCompactDensity
    ? "w-fit max-w-full space-y-[2px] pl-[4px] pt-[2px]"
    : "w-fit max-w-full space-y-[2px] pl-[4px] pt-[4px]";
  const compactRailTopPaddingClassName = useTightCompactDensity ? "pt-0" : "pt-0.5";
  const groupBySectionNode = groupByOptions.length > 1 ? (
    <div className={compactSectionStackClassName}>
      <div className={compactHeaderWrapClassName}>
        <p
          className={cn(
            compact
              ? appTokens.exercisePickerFilterGroupLabel
              : "text-[11px] font-medium uppercase tracking-wide",
          )}
        >
          Filter Categories
        </p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      <div className={cn(horizontalRailClassName, horizontalRailOverrideClassName)}>
        <div className={cn(compact ? "flex min-w-max flex-nowrap gap-1.5" : "flex min-w-max flex-nowrap gap-1")}>
          {showGroupByClearButton ? (
            <button
              type="button"
              onClick={() => setSelectedGroupKeys(clearGroupBySelection())}
              className={cn(
                appTokens.exercisePickerFilterClearButton,
                "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                "shrink-0 whitespace-nowrap",
                compact ? "mr-2.5 px-2 py-1 text-[10px]" : "mr-2",
              )}
            >
              Clear
            </button>
          ) : null}
          {groupByOptions.map((option) => {
            const isSelected = selectedGroupKeys.includes(option.key);
            return (
              <PillButton
                key={option.key}
                type="button"
                active={isSelected}
                className={cn(
                  "shrink-0 whitespace-nowrap",
                  compact ? "px-2 py-1 text-[10px]" : undefined,
                  isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                )}
                onClick={() => setSelectedGroupKeys((current) => toggleGroupBySelection(current, option.key))}
              >
                {option.label}
              </PillButton>
            );
          })}
        </div>
      </div>
      <div className="px-[4px] pt-0.5">
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
    </div>
  ) : null;

  return (
    <div className={className ?? "space-y-2"}>
      {hideButton ? null : (
        <Button
          type="button"
          variant={compact ? "secondary" : "ghost"}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className={cn(
            compact
              ? cn(appTokens.exercisePickerFilterToggle, "!border-[rgb(var(--accent)/0.52)]")
              : "w-full justify-between rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.54)] [-webkit-tap-highlight-color:transparent]",
            buttonClassName,
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <span>{headerLabel}</span>
          </span>
          <span className="ml-auto inline-flex min-w-0 items-center gap-2 pl-2">
            {trailingMeta ? (
              <span className={cn(appTokens.exercisePickerSectionMeta, selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.96)]" : undefined)}>
                {trailingMeta}
              </span>
            ) : null}
            {isOpen ? (
              <ChevronUpIcon className={cn("h-4 w-4", selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.92)]" : "text-muted")} />
            ) : (
              <ChevronDownIcon className={cn("h-4 w-4", selectedTags.length > 0 ? "text-[rgb(var(--accent)/0.92)]" : "text-muted")} />
            )}
          </span>
        </Button>
      )}

      {compact || hideButton || !(countDisplayMode === "always" || (countDisplayMode === "whenNonZero" && selectedTags.length > 0)) ? null : (
        <p className={cn("text-xs text-muted", summaryClassName)}>
          {selectedSummary}
        </p>
      )}

      {isOpen ? (
        <div
          className={cn(
            compact ? cn(appTokens.exercisePickerFilterPanel, `mx-auto w-full ${SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME} !border-[rgb(var(--accent)/0.42)] !shadow-none`) : "space-y-2",
            panelClassName,
          )}
        >
          {viewportMode === "auto-height" ? (
            <div className="space-y-2">
              {groupBySectionNode}
              {extraContent}
              {orderedGroups.map((group) => {
                const selectedTagsForGroup = group.tags
                  .map((tag) => tag.value)
                  .filter((tagValue) => selectedTags.includes(tagValue));

                return (
                  <div key={group.key} className={compact ? compactSectionStackClassName : "space-y-1"}>
                    <div className={compact ? compactHeaderWrapClassName : "w-fit max-w-full space-y-[2px] pl-[4px] pt-[4px]"}>
                      <p
                        className={cn(
                          compact
                            ? appTokens.exercisePickerFilterGroupLabel
                            : "text-[11px] font-medium uppercase tracking-wide",
                        )}
                      >
                        {group.label}
                      </p>
                      <MetricAccentBar variant="thin" className="w-full opacity-80" />
                    </div>
                    <div
                      className={cn(
                        useStackedTagLayout
                          ? "px-0.5 pb-1"
                          : cn(horizontalRailClassName, horizontalRailOverrideClassName),
                        compact ? compactRailTopPaddingClassName : undefined,
                      )}
                    >
                      <div
                        className={cn(
                          useStackedTagLayout
                            ? "flex flex-col gap-1.5"
                            : compact
                              ? "flex min-w-max flex-nowrap gap-1.5"
                              : "flex min-w-max flex-nowrap gap-1",
                        )}
                      >
                        {selectedTagsForGroup.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => onChange(selectedTags.filter((value) => !selectedTagsForGroup.includes(value)))}
                            className={cn(
                              appTokens.exercisePickerFilterClearButton,
                              "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                              "shrink-0 whitespace-nowrap",
                              compact ? "mr-2.5 px-2 py-1 text-[10px]" : "mr-2",
                            )}
                          >
                            Clear
                          </button>
                        ) : null}
                        {[...group.tags].sort((left, right) => {
                          const leftSelected = selectedTags.includes(left.value);
                          const rightSelected = selectedTags.includes(right.value);
                          if (leftSelected === rightSelected) return left.label.localeCompare(right.label);
                          return leftSelected ? -1 : 1;
                        }).map((tag) => {
                          const isSelected = selectedTags.includes(tag.value);
                          return (
                            <PillButton
                              key={tag.value}
                              type="button"
                              active={isSelected}
                              className={cn(
                                "max-w-full justify-start text-left leading-tight [word-break:normal]",
                                useStackedTagLayout ? "w-full whitespace-normal" : "shrink-0 whitespace-nowrap",
                                compact ? "px-2 py-1 text-[10px]" : undefined,
                                isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                              )}
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
                  </div>
                );
              })}
            </div>
          ) : (
            <FilterScrollPanel
              showEdgeFades={showScrollEdgeFades}
              viewportClassName={compact ? `${FILTER_OVERLAY_VIEWPORT_CLASS_NAME} pr-0` : "max-h-[min(48vh,24rem)] space-y-2"}
            >
              {groupBySectionNode}
              {extraContent}
              {orderedGroups.map((group) => {
                const selectedTagsForGroup = group.tags
                  .map((tag) => tag.value)
                  .filter((tagValue) => selectedTags.includes(tagValue));

                return (
                  <div key={group.key} className={compact ? compactSectionStackClassName : "space-y-1"}>
                    <div className={compact ? compactHeaderWrapClassName : "w-fit max-w-full space-y-[2px] pl-[4px] pt-[4px]"}>
                      <p
                        className={cn(
                          compact
                            ? appTokens.exercisePickerFilterGroupLabel
                            : "text-[11px] font-medium uppercase tracking-wide",
                        )}
                      >
                        {group.label}
                      </p>
                      <MetricAccentBar variant="thin" className="w-full opacity-80" />
                    </div>
                    <div
                      className={cn(
                        useStackedTagLayout
                          ? "px-0.5 pb-1"
                          : cn(horizontalRailClassName, horizontalRailOverrideClassName),
                        compact ? compactRailTopPaddingClassName : undefined,
                      )}
                    >
                      <div
                        className={cn(
                          useStackedTagLayout
                            ? "flex flex-col gap-1.5"
                            : compact
                              ? "flex min-w-max flex-nowrap gap-1.5"
                              : "flex min-w-max flex-nowrap gap-1",
                        )}
                      >
                        {selectedTagsForGroup.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => onChange(selectedTags.filter((value) => !selectedTagsForGroup.includes(value)))}
                            className={cn(
                              appTokens.exercisePickerFilterClearButton,
                              "!border-[rgb(var(--accent-yellow-on)/0.58)]",
                              "shrink-0 whitespace-nowrap",
                              compact ? "mr-2.5 px-2 py-1 text-[10px]" : "mr-2",
                            )}
                          >
                            Clear
                          </button>
                        ) : null}
                        {[...group.tags].sort((left, right) => {
                          const leftSelected = selectedTags.includes(left.value);
                          const rightSelected = selectedTags.includes(right.value);
                          if (leftSelected === rightSelected) return left.label.localeCompare(right.label);
                          return leftSelected ? -1 : 1;
                        }).map((tag) => {
                          const isSelected = selectedTags.includes(tag.value);
                          return (
                            <PillButton
                              key={tag.value}
                              type="button"
                              active={isSelected}
                              className={cn(
                                "max-w-full justify-start text-left leading-tight [word-break:normal]",
                                useStackedTagLayout ? "w-full whitespace-normal" : "shrink-0 whitespace-nowrap",
                                compact ? "px-2 py-1 text-[10px]" : undefined,
                                isSelected ? "!border-[rgb(var(--accent)/0.82)] !bg-[rgb(var(--accent)/0.42)] !text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgba(71,215,196,0.22),inset_0_0_0_1px_rgba(255,255,255,0.06)]" : undefined,
                              )}
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
                  </div>
                );
              })}
            </FilterScrollPanel>
          )}
        </div>
      ) : null}
    </div>
  );
}
