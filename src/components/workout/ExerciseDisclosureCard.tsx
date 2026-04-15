"use client";

import type { ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";
import { buildExerciseDisclosureContract } from "@/lib/exercise-disclosure";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import type { ExerciseCardButtonProps, ExerciseCardDensity, ExerciseCardState, ExerciseCardVariant } from "@/components/ExerciseCard";
import type { ExerciseGoalSummaryValue } from "@/lib/exercise-goal-summary";
import type { WorkoutCardSurface } from "@/lib/workout-card-surface-policy";

type DisclosureScope = "session-exercise" | "day-detail";

type ExerciseCardVisual = {
  name: string;
  slug?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

export function ExerciseDisclosureCard({
  scope,
  itemId,
  expanded,
  onToggle,
  exercise,
  summary,
  summaryLabel = "Goal",
  badgeText,
  state = "default",
  semanticTone,
  density = "compact",
  variant = "interactive",
  children,
  showLeadingVisual = false,
  leadingVisual,
  trailingClassName,
  bodyClassName,
  panelClassName,
  className,
}: {
  scope: DisclosureScope;
  itemId: string;
  expanded: boolean;
  onToggle: () => void;
  exercise: ExerciseCardVisual;
  summary?: ExerciseGoalSummaryValue;
  summaryLabel?: string;
  badgeText?: string;
  state?: ExerciseCardState;
  semanticTone?: CardSemanticTone;
  density?: ExerciseCardDensity;
  variant?: ExerciseCardVariant;
  children?: ReactNode;
  showLeadingVisual?: boolean;
  leadingVisual?: ReactNode;
  trailingClassName?: string;
  bodyClassName?: string;
  panelClassName?: string;
  className?: string;
}) {
  const contract = buildExerciseDisclosureContract({ itemId, scope });
  const surface: WorkoutCardSurface = scope === "session-exercise" ? "current-session" : "view-day";

  return (
    <div className={cn("overflow-hidden rounded-[1.25rem]", className)}>
      <StandardExerciseRow
        exercise={exercise}
        summary={summary}
        summaryLabel={summaryLabel}
        variant={variant}
        density={density}
        state={state}
        semanticTone={semanticTone}
        surface={surface}
        onPress={onToggle}
        showLeadingVisual={showLeadingVisual}
        leadingVisual={leadingVisual}
        buttonProps={{
          "aria-expanded": expanded,
          "aria-controls": contract.panelId,
          "data-testid": contract.buttonTestId,
        } satisfies ExerciseCardButtonProps}
        className={cn("shadow-none", expanded ? "rounded-b-none" : undefined)}
        trailingClassName={trailingClassName}
        bodyClassName={bodyClassName}
        rightIcon={(
          <ChevronRightIcon
            className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
              expanded ? "rotate-90 text-[rgb(var(--accent)/0.92)]" : "rotate-0 text-[rgb(var(--text-muted)/0.92)]",
            )}
          />
        )}
        badgeText={badgeText}
      />
      {expanded && children ? (
        <div
          id={contract.panelId}
          data-testid={contract.panelTestId}
          className={cn("border-t border-border/30 px-3.5 pb-3.5 pt-2.5 sm:px-4", panelClassName)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
