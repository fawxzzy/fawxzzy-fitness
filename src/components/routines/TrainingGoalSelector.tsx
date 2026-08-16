"use client";

import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { appTokens } from "@/components/ui/app/tokens";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { listTrainingGoalDefinitions, type TrainingGoalId } from "@/lib/progression-playbooks";

export const TRAINING_GOAL_SELECTOR_DROPDOWN_TITLE_CLASS_NAME =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.9)]";

export function TrainingGoalSelector({
  value,
  onChange,
  isCustomized = false,
  className,
  accentTitle = false,
  titleClassName,
  showTitleAccentBar = true,
}: {
  value: TrainingGoalId | "";
  onChange: (value: TrainingGoalId) => void;
  isCustomized?: boolean;
  className?: string;
  accentTitle?: boolean;
  titleClassName?: string;
  showTitleAccentBar?: boolean;
}) {
  const options = listTrainingGoalDefinitions();

  return (
    <section className={cn("space-y-2 pt-2", className)}>
      <div className="mx-auto w-fit max-w-full text-center">
        <p className={cn(
          titleClassName ?? cn(appTokens.routineEditorInlineTitle, "text-[0.82rem]"),
          accentTitle ? "text-[rgb(var(--accent-divider-rgb)/0.94)]" : undefined,
        )}>
          Training Focus
          {value && isCustomized ? (
            <span className="ml-2 text-[rgb(var(--secondary-action-rgb)/0.94)]">Customized</span>
          ) : null}
        </p>
        {showTitleAccentBar ? <MetricAccentBar variant="thin" className="mt-2 w-full opacity-85" /> : null}
      </div>
      <HorizontalScrollHint
        scrollClassName="pb-1"
        contentClassName={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}
      >
          {options.map((option) => {
            const isActive = value === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                data-action-chrome-intent={isActive ? "positive" : "neutral"}
                data-action-chrome-selected={isActive ? "true" : undefined}
                data-action-chrome-segmented="true"
                className={cn(
                  ACTION_CHROME_CONTROL_CLASS_NAME,
                  ACTION_CHROME_SEGMENTED_CLASS_NAME,
                  "min-h-11 min-w-[7.4rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                  isActive
                    ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                    : "text-[rgb(var(--text-secondary)/0.9)]",
                )}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
      </HorizontalScrollHint>
    </section>
  );
}
