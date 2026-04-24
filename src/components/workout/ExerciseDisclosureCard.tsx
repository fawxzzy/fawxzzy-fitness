"use client";

import type { CSSProperties, ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { buildExerciseDisclosureContract } from "@/lib/exercise-disclosure";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import type { ExerciseCardButtonProps, ExerciseCardDensity, ExerciseCardMediaLeftCornerMode, ExerciseCardState, ExerciseCardVariant } from "@/components/ExerciseCard";
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

const mediaDisclosureShellClassName = "rounded-l-none rounded-tl-none rounded-bl-none";

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
  showAccentRail = true,
  leadingVisual,
  cardClassName,
  shellClassName,
  shellStyle,
  titleMeta,
  trailingClassName,
  bodyClassName,
  contentClassName,
  panelClassName,
  subtitleTone,
  className,
  mediaLeftCornerMode,
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
  showAccentRail?: boolean;
  leadingVisual?: ReactNode;
  cardClassName?: string;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  titleMeta?: ReactNode;
  trailingClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  panelClassName?: string;
  subtitleTone?: "panel" | "plain";
  className?: string;
  mediaLeftCornerMode?: ExerciseCardMediaLeftCornerMode;
}) {
  const contract = buildExerciseDisclosureContract({ itemId, scope });
  const surface: WorkoutCardSurface = scope === "session-exercise" ? "current-session" : "view-day";

  const sharpMediaEdgeClassName = showLeadingVisual ? mediaDisclosureShellClassName : undefined;

  return (
    <div className={cn(appTokens.workoutCardDisclosureShell, sharpMediaEdgeClassName, className)}>
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
        titleMeta={titleMeta}
        buttonProps={{
          "aria-expanded": expanded,
          "aria-controls": contract.panelId,
          "data-testid": contract.buttonTestId,
        } satisfies ExerciseCardButtonProps}
        shellClassName={shellClassName}
        shellStyle={shellStyle}
        mediaLeftCornerMode={mediaLeftCornerMode}
        className={cn("shadow-none", expanded ? "rounded-b-none" : undefined, cardClassName)}
        trailingClassName={trailingClassName}
        bodyClassName={bodyClassName}
        contentClassName={contentClassName}
        subtitleTone={subtitleTone}
        showAccentRail={showAccentRail}
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
          className={cn(appTokens.workoutCardExpandedPanel, panelClassName)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
