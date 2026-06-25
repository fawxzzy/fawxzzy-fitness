import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { textRoles } from "@/components/ui/text-roles";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardMediaToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";

export type ExerciseCardVariant = "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
export type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";
export type ExerciseCardDensity = "compact" | "detailed";
export type ExerciseCardButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "className"> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};
export type ExerciseCardMediaLayout = "rail" | "inline";
export type ExerciseCardMediaLeftCornerMode = "sharp" | "top-rounded";
export type ExerciseCardRightIconMode = "rail" | "overlay";
export type ExerciseCardContentVerticalAlign = "auto" | "top";
export type ExerciseCardTitleMetaMode = "inline" | "overlay-tight";

const densityByVariant: Record<ExerciseCardVariant, ExerciseCardDensity> = {
  standard: "detailed",
  compact: "compact",
  list: "compact",
  interactive: "compact",
  expanded: "detailed",
  summary: "detailed",
  reorder: "compact",
};

const densityStyles: Record<ExerciseCardDensity, {
  shell: string;
  shellWithMedia: string;
  titleClamp: string;
  subtitleClamp: string;
  titleSize: string;
  contentGap: string;
  goalRow: string;
  childrenSpacing: string;
}> = {
  compact: {
    shell: "min-h-[var(--exercise-row-min-height-compact)] py-[var(--exercise-row-shell-padding-y-compact)] pr-[var(--exercise-row-shell-padding-x)]",
    shellWithMedia: "pl-0",
    titleClamp: "",
    subtitleClamp: "",
    titleSize: "text-[0.92rem]",
    contentGap: "gap-0.5",
    goalRow: appTokens.workoutCardGoalRowCompact,
    childrenSpacing: "mt-[0.125rem]",
  },
  detailed: {
    shell: "min-h-[var(--exercise-row-min-height-detailed)] py-[var(--exercise-row-shell-padding-y-detailed)] pr-[var(--exercise-row-shell-padding-x)]",
    shellWithMedia: "pl-0",
    titleClamp: "",
    subtitleClamp: "",
    titleSize: "text-[clamp(1rem,2.35vw,1.05rem)]",
    contentGap: "gap-1",
    goalRow: appTokens.workoutCardGoalRowDetailed,
    childrenSpacing: "mt-[0.3125rem]",
  },
};

export const EXERCISE_CARD_LABEL_CLASS_NAME = appTokens.measurementLabel;
export const EXERCISE_CARD_SUMMARY_CLASS_NAME = cn("text-safe-wrap pr-0.5 text-[12px] leading-[1.36] [text-wrap:pretty]", appTokens.exerciseCardSummaryTextPad);
export const EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME = cn(appTokens.workoutCardDetailCompact, appTokens.exerciseCardTertiaryTextPad);
export const EXERCISE_CARD_BADGE_CLASS_NAME = cn(appTokens.badgeBase, "min-h-[1.5rem] px-2.5 py-1 text-[10px] tracking-[0.12em]");
export const EXERCISE_CARD_TRAILING_ICON_CLASS_NAME = "flex h-full min-h-10 items-center justify-end";

const shellStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)]",
  selected: "border-[rgb(var(--selection-rgb)/0.34)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.12),rgb(var(--surface-1-rgb)/0.96))] ring-1 ring-[rgb(var(--selection-rgb)/0.1)]",
  active: "border-[rgb(var(--selection-rgb)/0.42)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.16),rgb(var(--surface-2-rgb)/0.96))] ring-1 ring-[rgb(var(--selection-rgb)/0.14)]",
  completed: "border-[rgb(var(--success-rgb)/0.92)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.62),rgb(var(--surface-2-rgb)/0.98))] ring-1 ring-[rgb(var(--success-rgb)/0.48)]",
  empty: "border-dashed border-[rgb(var(--warning-rgb)/0.3)] bg-[rgb(var(--surface-1-rgb)/0.76)]",
};

const thumbStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--bg-2)/0.56)]",
  selected: "border-[rgb(var(--selection-rgb)/0.28)] bg-[rgb(var(--selection-rgb)/0.08)]",
  active: "border-[rgb(var(--selection-rgb)/0.32)] bg-[rgb(var(--selection-rgb)/0.1)]",
  completed: "border-[rgb(var(--success-rgb)/0.72)] bg-[rgb(var(--success-rgb)/0.4)]",
  empty: "border-dashed border-[rgb(var(--warning-rgb)/0.26)] bg-[rgb(var(--warning-rgb)/0.08)]",
};

const titleStateClassNames: Record<ExerciseCardState, string> = {
  default: textRoles.title,
  selected: "text-[rgb(var(--text)/1)]",
  active: "text-[rgb(var(--text)/0.98)]",
  completed: "text-[rgb(216_255_229)]",
  empty: "text-[rgb(var(--text)/0.92)]",
};

const subtitleStateClassNames: Record<ExerciseCardState, string> = {
  default: textRoles.subtitle,
  selected: "text-[rgb(var(--text-secondary)/0.96)]",
  active: "text-[rgb(var(--text-secondary)/0.98)]",
  completed: "text-[rgb(198_245_214/0.99)]",
  empty: "text-[rgb(var(--text-muted)/0.98)]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.92)] text-[rgb(var(--text-primary)/0.88)]",
  selected: "border-[rgb(var(--selection-rgb)/0.32)] bg-[rgb(var(--selection-rgb)/0.14)] text-[rgb(var(--text-primary))]",
  active: "border-[rgb(var(--selection-rgb)/0.34)] bg-[rgb(var(--selection-rgb)/0.16)] text-[rgb(var(--text-primary))]",
  completed: "border-[rgb(var(--success-rgb)/0.82)] bg-[rgb(var(--success-rgb)/0.46)] text-[rgb(250_255_252)]",
  empty: "border-[rgb(var(--warning-rgb)/0.32)] bg-[rgb(var(--warning-rgb)/0.14)] text-[rgb(255_242_220)]",
};

function resolveStatusBadgeClassName(badgeText: string | undefined, state: ExerciseCardState, semanticTone: CardSemanticTone) {
  const normalizedBadgeText = badgeText?.trim().toUpperCase();

  if (normalizedBadgeText === "ACTIVE" || normalizedBadgeText === "COMPLETED" || normalizedBadgeText === "IN SESSION") {
    return appTokens.successBadge;
  }

  if (normalizedBadgeText === "TODAY") {
    return appTokens.todayBadge;
  }

  if (normalizedBadgeText === "REST DAY" || normalizedBadgeText === "NEEDS SETUP") {
    return appTokens.warningBadge;
  }

  return cn(badgeStateClassNames[state], cardBadgeToneClassNames[semanticTone]);
}
const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;
const cardPressClassName = "motion-reduce:transition-none";
const cardPressNoScaleClassName = "motion-reduce:transition-none";

function resolveDefaultSemanticTone(state: ExerciseCardState): CardSemanticTone {
  if (state === "selected" || state === "active") {
    return "current";
  }

  if (state === "completed") {
    return "completed";
  }

  if (state === "empty") {
    return "attention";
  }

  return "neutral";
}

function renderAccentDotSummary(subtitle: ReactNode, subtitleClassName?: string) {
  if (typeof subtitle !== "string" || !subtitle.includes("•")) {
    return subtitle;
  }

  return (
    <AccentDotSeparatedText
      text={subtitle}
      itemClassName={subtitleClassName}
      separatorClassName="bg-[rgb(var(--accent-divider-rgb)/0.96)]"
      pipeClassName="w-[0.48rem]"
      pipeBarClassName="h-[0.82em] w-[2.5px] bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.96),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent-divider-rgb)/0.92))] shadow-[0_0_12px_rgb(var(--accent-divider-rgb)/0.46)]"
    />
  );
}

function renderStructuredSummary(subtitle: ReactNode, subtitleClassName?: string) {
  if (
    typeof subtitle !== "string"
    || (!subtitle.includes("|") && !subtitle.includes("•") && !subtitle.includes("â€¢"))
  ) {
    return subtitle;
  }

  return (
    <AccentDotSeparatedText
      text={subtitle}
      itemClassName={subtitleClassName}
      separatorClassName="bg-[rgb(var(--accent-divider-rgb)/0.96)]"
      pipeClassName="w-[0.48rem]"
      pipeBarClassName="h-[0.82em] w-[2.5px] bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.96),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent-divider-rgb)/0.92))] shadow-[0_0_12px_rgb(var(--accent-divider-rgb)/0.46)]"
    />
  );
}

export function ExerciseCard({
  title,
  titleMeta,
  subtitle,
  children,
  leadingVisual,
  onPress,
  rightIcon = defaultChevron,
  overlayActions,
  overlayActionsClassName,
  actions,
  badgeText,
  disabled = false,
  className,
  trailingClassName,
  rightRailClassName,
  trailingStackClassName,
  mediaClassName,
  bodyClassName,
  contentClassName,
  titleContainerClassName,
  titleClassName,
  subtitleClassName,
  subtitleLabelClassName,
  headerDivider,
  disablePressScale = false,
  disableSurfacePressScale = true,
  subtitleLabel,
  subtitleTone = "panel",
  buttonProps,
  showAccentRail = true,
  variant = "standard",
  state = "default",
  density,
  semanticTone,
  mediaLayout = "rail",
  mediaRailWidth,
  shellStyle,
  mediaLeftCornerMode = "sharp",
  rightIconMode = "rail",
  titleMetaMode = "inline",
  contentVerticalAlign = "auto",
  progressFill,
}: {
  title: ReactNode;
  titleMeta?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  leadingVisual?: ReactNode;
  onPress?: () => void;
  rightIcon?: ReactNode;
  overlayActions?: ReactNode;
  overlayActionsClassName?: string;
  actions?: ReactNode;
  badgeText?: string;
  disabled?: boolean;
  className?: string;
  trailingClassName?: string;
  rightRailClassName?: string;
  trailingStackClassName?: string;
  mediaClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
  titleContainerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  subtitleLabelClassName?: string;
  headerDivider?: ReactNode;
  disablePressScale?: boolean;
  disableSurfacePressScale?: boolean;
  subtitleLabel?: string;
  subtitleTone?: "panel" | "plain";
  buttonProps?: ExerciseCardButtonProps;
  showAccentRail?: boolean;
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
  density?: ExerciseCardDensity;
  semanticTone?: CardSemanticTone;
  mediaLayout?: ExerciseCardMediaLayout;
  mediaRailWidth?: number;
  shellStyle?: CSSProperties;
  mediaLeftCornerMode?: ExerciseCardMediaLeftCornerMode;
  rightIconMode?: ExerciseCardRightIconMode;
  titleMetaMode?: ExerciseCardTitleMetaMode;
  contentVerticalAlign?: ExerciseCardContentVerticalAlign;
  progressFill?: ProgressionProgressFill | null;
}) {
  const resolvedDensity = density ?? densityByVariant[variant];
  const styles = densityStyles[resolvedDensity];
  const resolvedSemanticTone = semanticTone ?? resolveDefaultSemanticTone(state);
  const resolvedBadgeClassName = resolveStatusBadgeClassName(badgeText, state, resolvedSemanticTone);
  const hasLeadingVisual = leadingVisual !== null && leadingVisual !== undefined && leadingVisual !== false;
  const usesRailMedia = hasLeadingVisual && mediaLayout === "rail";
  const usesInlineMedia = hasLeadingVisual && mediaLayout === "inline";
  const hasRightIcon = rightIcon !== null && rightIcon !== undefined;
  const hasOverlayActions = overlayActions !== null && overlayActions !== undefined && overlayActions !== false;
  const hasTitleMeta = titleMeta !== null && titleMeta !== undefined && titleMeta !== false;
  const usesOverlayTightTitleMeta = hasTitleMeta && titleMetaMode === "overlay-tight";
  const hasBadgeText = Boolean(badgeText?.trim());
  const hasSupportingContent = Boolean(subtitle) || Boolean(headerDivider) || Boolean(children);
  const resolvedSubtitleLabel = typeof subtitleLabel === "string" && subtitleLabel.trim().toLowerCase() === "goal"
    ? undefined
    : subtitleLabel;
  const resolvedMediaRailWidth = mediaRailWidth ?? (resolvedDensity === "detailed" ? 76 : 72);
  const bodyGridStyle = { gridTemplateColumns: hasRightIcon && rightIconMode === "rail" ? "minmax(0,1fr) auto" : "minmax(0,1fr)" } satisfies CSSProperties;
  const mediaColumnStyle = usesRailMedia
    ? { gridTemplateColumns: `${resolvedMediaRailWidth}px minmax(0,1fr)` } satisfies CSSProperties
    : usesInlineMedia
      ? { gridTemplateColumns: "auto minmax(0,1fr)" } satisfies CSSProperties
      : undefined;
  const resolvedShellStyle = usesRailMedia
    ? {
        ...shellStyle,
        borderTopLeftRadius: mediaLeftCornerMode === "top-rounded" ? "var(--card-radius)" : "0px",
        borderBottomLeftRadius: "0px",
      } satisfies CSSProperties
    : shellStyle;
  const progressFillPercent = progressFill && progressFill.percent > 0 && progressFill.state !== "manual_hidden" && progressFill.state !== "unsupported"
    ? Math.max(0, Math.min(100, progressFill.percent))
    : null;
  const isFullProgressFill = progressFillPercent !== null && progressFillPercent >= 100;
  const progressFillStyle = progressFillPercent !== null
    ? ({
        "--exercise-card-progress-fill-width": `${progressFillPercent}%`,
      } as CSSProperties)
    : undefined;
  const railProgressFillStyle = progressFillPercent !== null && usesRailMedia
    ? ({
        "--exercise-card-progress-fill-width": `${progressFillPercent}%`,
        "--exercise-card-progress-fill-left": `${resolvedMediaRailWidth}px`,
        "--exercise-card-progress-fill-span": `calc((100% - ${resolvedMediaRailWidth}px) * ${progressFillPercent / 100})`,
      } as CSSProperties)
    : undefined;

  const bodyContent = (
    <div
      className={cn(
        "relative grid w-full min-w-0 items-stretch gap-[var(--exercise-row-gap)] overflow-visible",
        styles.shell,
        usesRailMedia ? styles.shellWithMedia : "pl-[var(--exercise-row-shell-padding-x)]",
        bodyClassName,
      )}
      style={bodyGridStyle}
      data-exercise-card-density={resolvedDensity}
      data-exercise-card-media={usesRailMedia ? "rail" : usesInlineMedia ? "inline" : "none"}
    >
      {showAccentRail ? (
        <span
          aria-hidden="true"
          data-exercise-card-accent-rail="true"
          className={cn(
            "pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full z-[2]",
            cardAccentRailClassNames[resolvedSemanticTone],
          )}
        />
      ) : null}
      {progressFillPercent !== null && usesRailMedia ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 top-0 z-0 overflow-hidden bg-[linear-gradient(90deg,rgb(var(--accent)/0.30),rgb(var(--accent)/0.17))]",
            isFullProgressFill
              ? "right-0 rounded-br-[var(--exercise-card-progress-fill-bottom-right-radius,calc(var(--card-radius)-2px))] rounded-tr-[var(--exercise-card-progress-fill-top-right-radius,calc(var(--card-radius)-2px))]"
              : "w-[var(--exercise-card-progress-fill-span)] rounded-r-[999px] shadow-[0_0_18px_rgb(var(--accent)/0.12)]",
            isFullProgressFill ? "shadow-[inset_-10px_0_18px_rgb(var(--accent)/0.20)]" : undefined,
          )}
          style={{
            ...railProgressFillStyle,
            left: "var(--exercise-card-progress-fill-left)",
          }}
        >
          <span className="exercise-card-progress-glint" />
        </span>
      ) : null}
      {hasBadgeText ? (
        <span
          className={cn(
            "pointer-events-none absolute right-[var(--exercise-row-shell-padding-x)] top-2 z-[1] shrink-0",
            EXERCISE_CARD_BADGE_CLASS_NAME,
            resolvedBadgeClassName,
          )}
        >
          {badgeText}
        </span>
      ) : null}
      <div className="grid min-w-0 items-stretch" style={mediaColumnStyle}>
        {usesRailMedia ? (
          <div
            className={cn(
              "relative -my-[var(--exercise-row-shell-padding-y-compact)] min-h-[calc(var(--exercise-row-media-min-height-compact)+(var(--exercise-row-shell-padding-y-compact)*2))] self-stretch overflow-hidden rounded-l-[inherit] border-r border-[rgb(var(--border-strong)/0.14)] transition-colors",
              resolvedDensity === "detailed"
                ? "-my-[var(--exercise-row-shell-padding-y-detailed)] min-h-[calc(var(--exercise-row-media-min-height-detailed)+(var(--exercise-row-shell-padding-y-detailed)*2))]"
                : undefined,
              showAccentRail ? "pl-[8px]" : undefined,
              thumbStateClassNames[state],
              cardMediaToneClassNames[resolvedSemanticTone],
              mediaClassName,
            )}
          >
            {leadingVisual}
          </div>
        ) : usesInlineMedia ? (
          <div className={cn("relative flex shrink-0 items-center justify-center self-center", mediaClassName)}>
            {leadingVisual}
          </div>
        ) : null}

        <div className={cn("relative min-w-0 self-stretch overflow-visible py-0.5", contentClassName)}>
          {progressFillPercent !== null && !usesRailMedia ? (
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute z-0 overflow-hidden bg-[linear-gradient(90deg,rgb(var(--accent)/0.30),rgb(var(--accent)/0.17))]",
                isFullProgressFill
                  ? "inset-0 w-full rounded-br-[var(--exercise-card-progress-fill-bottom-right-radius,calc(var(--card-radius)-2px))] rounded-tr-[var(--exercise-card-progress-fill-top-right-radius,calc(var(--card-radius)-2px))]"
                  : "bottom-0 left-0 top-0 w-[var(--exercise-card-progress-fill-width)] rounded-r-[999px] shadow-[0_0_18px_rgb(var(--accent)/0.12)]",
                isFullProgressFill ? "shadow-[inset_-10px_0_18px_rgb(var(--accent)/0.20)]" : undefined,
              )}
              style={progressFillStyle}
            >
              <span className="exercise-card-progress-glint" />
            </span>
          ) : null}
          <div
            className={cn(
              "relative z-[1] flex min-h-full min-w-0 flex-col",
              contentVerticalAlign === "top" || hasSupportingContent ? "justify-start" : "justify-center",
              styles.contentGap,
              hasBadgeText && !hasTitleMeta ? (resolvedDensity === "compact" ? "pr-[5.2rem]" : "pr-[5.6rem]") : undefined,
              usesOverlayTightTitleMeta ? (resolvedDensity === "compact" ? "pr-[4.9rem]" : "pr-[5.2rem]") : undefined,
              titleContainerClassName,
            )}
          >
            {usesOverlayTightTitleMeta ? (
              <div
                className={cn(
                  "pointer-events-none absolute right-[1.68rem] top-[0.04rem] z-[2] inline-flex max-w-[3.2rem] items-center justify-end whitespace-nowrap text-right text-[0.94rem] font-semibold leading-[1.06]",
                  titleStateClassNames[state],
                )}
                data-exercise-card-title-meta="true"
              >
                {titleMeta}
              </div>
            ) : null}
            <div className="flex min-w-0 items-start justify-between gap-1.5">
              <p
                className={cn(
                  "text-safe-wrap min-w-0 flex-1 leading-tight [text-wrap:pretty]",
                  styles.titleClamp,
                  styles.titleSize,
                  appTokens.exerciseCardTitleTextPad,
                  "font-semibold",
                  titleStateClassNames[state],
                  titleClassName,
                )}
                data-exercise-card-title="true"
              >
                {title}
              </p>
              {hasTitleMeta && !usesOverlayTightTitleMeta ? (
                <div
                  className={cn(
                    "shrink-0 whitespace-nowrap px-1 text-[1rem] font-semibold leading-tight",
                    titleStateClassNames[state],
                  )}
                  data-exercise-card-title-meta="true"
                >
                  {titleMeta}
                </div>
              ) : null}
            </div>
            {subtitle ? (
              subtitleTone === "plain" ? (
                <div className="min-w-0">
                  {resolvedSubtitleLabel ? (
                    <p className={cn("mb-0.5", EXERCISE_CARD_LABEL_CLASS_NAME, subtitleLabelClassName)}>
                      {resolvedSubtitleLabel}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      EXERCISE_CARD_SUMMARY_CLASS_NAME,
                      styles.subtitleClamp,
                      subtitleStateClassNames[state],
                      subtitleClassName,
                    )}
                    data-exercise-card-summary="true"
                  >
                {renderStructuredSummary(subtitle, subtitleClassName)}
                  </div>
                </div>
              ) : (
                <div className={cn("min-w-0", styles.goalRow)}>
                  {resolvedSubtitleLabel ? (
                    <p className={cn("mb-0.5", EXERCISE_CARD_LABEL_CLASS_NAME, subtitleLabelClassName)}>
                      {resolvedSubtitleLabel}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      EXERCISE_CARD_SUMMARY_CLASS_NAME,
                      styles.subtitleClamp,
                      subtitleStateClassNames[state],
                      subtitleClassName,
                    )}
                    data-exercise-card-summary="true"
                  >
              {renderStructuredSummary(subtitle, subtitleClassName)}
                  </div>
                </div>
              )
            ) : null}
            {headerDivider ? (
              <div className={cn("min-w-0", styles.childrenSpacing)} data-exercise-card-header-divider="true">
                {headerDivider}
              </div>
            ) : null}
            {children ? (
              <div className={cn("min-w-0", styles.childrenSpacing)} data-exercise-card-supporting="true">
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hasRightIcon && rightIconMode === "rail" ? (
        <div
          className={cn(
            "relative z-[1] flex min-h-full min-w-[var(--exercise-row-trailing-min-width)] shrink-0 items-center self-stretch justify-end",
            trailingClassName,
            rightRailClassName,
          )}
        >
            <div
              className={cn(
                EXERCISE_CARD_TRAILING_ICON_CLASS_NAME,
                trailingStackClassName,
              )}
            >
              {rightIcon}
            </div>
        </div>
      ) : null}
      {hasRightIcon && rightIconMode === "overlay" ? (
        <div
          className={cn(
            "pointer-events-none absolute right-[var(--exercise-row-shell-padding-x)] top-1/2 z-[1] -translate-y-1/2",
            rightRailClassName,
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center",
              trailingStackClassName,
            )}
          >
            {rightIcon}
          </div>
        </div>
      ) : null}
    </div>
  );

  const shellClassName = cn(
    "w-full max-w-none overflow-hidden rounded-[var(--card-radius)] text-left",
    shellStateClassNames[state],
    cardShellToneClassNames[resolvedSemanticTone],
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );
  const resolvedPressClassName = disablePressScale ? cardPressNoScaleClassName : cardPressClassName;
  const overlayActionsNode = hasOverlayActions ? (
    <div
      className={cn(
        "pointer-events-none absolute right-[var(--exercise-row-shell-padding-x)] top-1/2 z-[2] flex -translate-y-1/2 items-center justify-center",
        overlayActionsClassName,
      )}
    >
      {overlayActions}
    </div>
  ) : null;

  if (actions) {
    return (
      <Glass variant="base" interactive={!disabled} disablePressScale={disableSurfacePressScale} className={shellClassName} style={resolvedShellStyle}>
        <div className="relative flex w-full items-stretch gap-2">
          {overlayActionsNode}
          {onPress ? (
            <button
              type="button"
              {...buttonProps}
              className={cn("min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]", resolvedPressClassName)}
              onClick={onPress}
              disabled={disabled}
            >
              {bodyContent}
            </button>
          ) : (
            <div className="min-w-0 flex-1">{bodyContent}</div>
          )}
          <div className="flex shrink-0 items-center gap-1.5 px-2 py-2">{actions}</div>
        </div>
      </Glass>
    );
  }

  if (onPress) {
    return (
      <Glass variant="base" interactive={!disabled} disablePressScale={disableSurfacePressScale} className={shellClassName} style={resolvedShellStyle}>
        <div className="relative">
          {overlayActionsNode}
          <button
            type="button"
            {...buttonProps}
            className={cn("block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]", resolvedPressClassName)}
            onClick={onPress}
            disabled={disabled}
          >
            {bodyContent}
          </button>
        </div>
      </Glass>
    );
  }

  return (
    <Glass variant="base" className={shellClassName} style={resolvedShellStyle}>
      <div className="relative">
        {overlayActionsNode}
        {bodyContent}
      </div>
    </Glass>
  );
}
