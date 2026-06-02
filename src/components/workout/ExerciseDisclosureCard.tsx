"use client";

import type { CSSProperties, ReactNode } from "react";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { buildExerciseDisclosureContract } from "@/lib/exercise-disclosure";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import type { ExerciseCardButtonProps, ExerciseCardContentVerticalAlign, ExerciseCardDensity, ExerciseCardMediaLeftCornerMode, ExerciseCardRightIconMode, ExerciseCardState, ExerciseCardVariant } from "@/components/ExerciseCard";
import type { ExerciseGoalSummaryValue } from "@/lib/exercise-goal-summary";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
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
  keepPanelMounted = false,
  onToggle,
  exercise,
  summary,
  summaryContent,
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
  overlayActions,
  overlayActionsClassName,
  trailingClassName,
  rightRailClassName,
  mediaClassName,
  bodyClassName,
  contentClassName,
  subtitleClassName,
  panelClassName,
  subtitleTone,
  className,
  mediaLeftCornerMode,
  rightIconMode,
  hideEmptySummary = false,
  contentVerticalAlign,
  progressFill,
  stickyHeaderWhenExpanded = false,
}: {
  scope: DisclosureScope;
  itemId: string;
  expanded: boolean;
  keepPanelMounted?: boolean;
  onToggle: () => void;
  exercise: ExerciseCardVisual;
  summary?: ExerciseGoalSummaryValue;
  summaryContent?: ReactNode;
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
  overlayActions?: ReactNode;
  overlayActionsClassName?: string;
  trailingClassName?: string;
  rightRailClassName?: string;
  mediaClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  subtitleClassName?: string;
  panelClassName?: string;
  subtitleTone?: "panel" | "plain";
  className?: string;
  mediaLeftCornerMode?: ExerciseCardMediaLeftCornerMode;
  rightIconMode?: ExerciseCardRightIconMode;
  hideEmptySummary?: boolean;
  contentVerticalAlign?: ExerciseCardContentVerticalAlign;
  progressFill?: ProgressionProgressFill | null;
  stickyHeaderWhenExpanded?: boolean;
}) {
  const contract = buildExerciseDisclosureContract({ itemId, scope });
  const surface: WorkoutCardSurface = scope === "session-exercise" ? "current-session" : "view-day";
  const isCompletedSessionCard = scope === "session-exercise" && state === "completed";
  const resolvedRightIconMode = rightIconMode ?? (scope === "session-exercise" ? "overlay" : "rail");
  const resolvedRightRailClassName = cn(
    scope === "session-exercise" ? "!top-auto bottom-[0.9rem] !translate-y-0" : undefined,
    rightRailClassName,
  );

  const sharpMediaEdgeClassName = showLeadingVisual ? mediaDisclosureShellClassName : undefined;
  const stickyHeaderActive = stickyHeaderWhenExpanded && expanded;

  return (
    <div className={cn(appTokens.workoutCardDisclosureShell, stickyHeaderActive ? "overflow-visible" : "overflow-hidden", sharpMediaEdgeClassName, className)}>
      <div
        className={cn(
          stickyHeaderActive
            ? "sticky top-0 z-20 pb-2 pt-px [background:linear-gradient(180deg,rgba(var(--bg-app),0.98)_0%,rgba(var(--bg-app),0.92)_78%,rgba(var(--bg-app),0)_100%)] backdrop-blur-[8px]"
            : undefined,
        )}
      >
        <StandardExerciseRow
          exercise={exercise}
          summary={summary}
          summaryContent={summaryContent}
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
          overlayActions={overlayActions}
          overlayActionsClassName={overlayActionsClassName}
          buttonProps={{
            "aria-expanded": expanded,
            "aria-controls": contract.panelId,
            "data-testid": contract.buttonTestId,
          } satisfies ExerciseCardButtonProps}
          shellClassName={shellClassName}
          shellStyle={shellStyle}
          mediaLeftCornerMode={mediaLeftCornerMode}
          className={cn("shadow-none", cardClassName)}
          trailingClassName={trailingClassName}
          rightRailClassName={resolvedRightRailClassName}
          mediaClassName={mediaClassName}
          bodyClassName={bodyClassName}
          contentClassName={contentClassName}
          subtitleClassName={subtitleClassName}
          subtitleTone={subtitleTone}
          showAccentRail={showAccentRail}
          hideEmptySummary={hideEmptySummary}
          rightIconMode={resolvedRightIconMode}
          contentVerticalAlign={contentVerticalAlign}
          progressFill={progressFill}
          rightIcon={(
            expanded
              ? <ChevronDownIcon className={cn("h-5 w-5 shrink-0", isCompletedSessionCard ? "text-[rgb(var(--success-rgb)/0.98)]" : "text-[rgb(var(--accent)/0.92)]", appTokens.historyChevronIcon)} />
              : <ChevronRightIcon className={cn("h-5 w-5 shrink-0", isCompletedSessionCard ? "text-[rgb(var(--success-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.92)]", appTokens.historyChevronIcon)} />
          )}
          badgeText={badgeText}
        />
      </div>
      {(expanded || keepPanelMounted) && children ? (
        <div
          id={contract.panelId}
          data-testid={contract.panelTestId}
          aria-hidden={!expanded}
          className={cn(
            appTokens.workoutCardExpandedPanel,
            !expanded ? "hidden" : undefined,
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
