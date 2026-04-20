import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { textRoles } from "@/components/ui/text-roles";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardMediaToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

export type ExerciseCardVariant = "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
export type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";
export type ExerciseCardDensity = "compact" | "detailed";
export type ExerciseCardButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "className"> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};
export type ExerciseCardMediaLayout = "rail" | "inline";

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
    titleClamp: "line-clamp-2",
    subtitleClamp: "line-clamp-2",
    titleSize: "text-[0.92rem]",
    contentGap: "gap-0.5",
    goalRow: "rounded-[0.78rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.52)] px-2 py-1",
    childrenSpacing: "mt-0.75",
  },
  detailed: {
    shell: "min-h-[var(--exercise-row-min-height-detailed)] py-[var(--exercise-row-shell-padding-y-detailed)] pr-[var(--exercise-row-shell-padding-x)]",
    shellWithMedia: "pl-0",
    titleClamp: "line-clamp-2",
    subtitleClamp: "line-clamp-3",
    titleSize: "text-[clamp(1rem,2.35vw,1.05rem)]",
    contentGap: "gap-1",
    goalRow: "rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-2.5 py-1.5",
    childrenSpacing: "mt-1.25",
  },
};

export const EXERCISE_CARD_LABEL_CLASS_NAME = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.84)]";
export const EXERCISE_CARD_SUMMARY_CLASS_NAME = "text-safe-wrap pr-0.5 text-[12px] leading-[1.3] [text-wrap:pretty]";
export const EXERCISE_CARD_TERTIARY_TEXT_CLASS_NAME = "text-[11px] leading-[1.3] text-[rgb(var(--text-muted)/0.88)] [text-wrap:pretty]";
export const EXERCISE_CARD_BADGE_CLASS_NAME = "inline-flex min-h-[1.5rem] items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none";
export const EXERCISE_CARD_TRAILING_ICON_CLASS_NAME = "flex h-full min-h-10 items-center justify-end";

const shellStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)]",
  selected: "border-[rgb(var(--accent)/0.34)] bg-[linear-gradient(180deg,rgba(71,215,196,0.12),rgba(14,24,38,0.96))] ring-1 ring-[rgb(var(--accent)/0.1)]",
  active: "border-[rgb(var(--accent)/0.42)] bg-[linear-gradient(180deg,rgba(71,215,196,0.16),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent)/0.14)]",
  completed: "border-[rgb(var(--success-rgb)/0.34)] bg-[linear-gradient(180deg,rgba(79,209,126,0.14),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--success-rgb)/0.12)]",
  empty: "border-dashed border-[rgb(var(--warning-rgb)/0.3)] bg-[rgb(var(--surface-1-rgb)/0.76)]",
};

const thumbStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--bg-2)/0.56)]",
  selected: "border-[rgb(var(--accent)/0.28)] bg-[rgb(var(--accent)/0.08)]",
  active: "border-[rgb(var(--accent)/0.32)] bg-[rgb(var(--accent)/0.1)]",
  completed: "border-[rgb(var(--success-rgb)/0.3)] bg-[rgb(var(--success-rgb)/0.1)]",
  empty: "border-dashed border-[rgb(var(--warning-rgb)/0.26)] bg-[rgb(var(--warning-rgb)/0.08)]",
};

const titleStateClassNames: Record<ExerciseCardState, string> = {
  default: textRoles.title,
  selected: "text-[rgb(var(--text)/1)]",
  active: "text-[rgb(var(--text)/0.98)]",
  completed: "text-[rgb(244_249_248)]",
  empty: "text-[rgb(var(--text)/0.92)]",
};

const subtitleStateClassNames: Record<ExerciseCardState, string> = {
  default: textRoles.subtitle,
  selected: "text-[rgb(var(--text-secondary)/0.96)]",
  active: "text-[rgb(var(--text-secondary)/0.98)]",
  completed: "text-[rgb(var(--text-secondary)/0.96)]",
  empty: "text-[rgb(var(--text-muted)/0.98)]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.92)] text-[rgb(var(--text-primary)/0.88)]",
  selected: "border-[rgb(var(--accent)/0.32)] bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text-primary))]",
  active: "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--text-primary))]",
  completed: "border-[rgb(var(--success-rgb)/0.34)] bg-[rgb(var(--success-rgb)/0.14)] text-[rgb(var(--text-primary))]",
  empty: "border-[rgb(var(--warning-rgb)/0.32)] bg-[rgb(var(--warning-rgb)/0.14)] text-[rgb(255_242_220)]",
};

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;
const cardPressClassName = "transition-[transform,filter] duration-75 ease-out active:scale-[0.992] active:brightness-[1.02] motion-reduce:transform-none motion-reduce:transition-none";

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

export function ExerciseCard({
  title,
  subtitle,
  children,
  leadingVisual,
  onPress,
  rightIcon = defaultChevron,
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
  subtitleLabel,
  buttonProps,
  variant = "standard",
  state = "default",
  density,
  semanticTone,
  mediaLayout = "rail",
  mediaRailWidth,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  leadingVisual?: ReactNode;
  onPress?: () => void;
  rightIcon?: ReactNode;
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
  subtitleLabel?: string;
  buttonProps?: ExerciseCardButtonProps;
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
  density?: ExerciseCardDensity;
  semanticTone?: CardSemanticTone;
  mediaLayout?: ExerciseCardMediaLayout;
  mediaRailWidth?: number;
}) {
  const resolvedDensity = density ?? densityByVariant[variant];
  const styles = densityStyles[resolvedDensity];
  const resolvedSemanticTone = semanticTone ?? resolveDefaultSemanticTone(state);
  const hasLeadingVisual = leadingVisual !== null && leadingVisual !== undefined && leadingVisual !== false;
  const usesRailMedia = hasLeadingVisual && mediaLayout === "rail";
  const usesInlineMedia = hasLeadingVisual && mediaLayout === "inline";
  const hasRightIcon = rightIcon !== null && rightIcon !== undefined;
  const hasSupportingContent = Boolean(subtitle) || Boolean(children);
  const resolvedMediaRailWidth = mediaRailWidth ?? (resolvedDensity === "detailed" ? 76 : 72);
  const bodyGridStyle = { gridTemplateColumns: hasRightIcon || badgeText ? "minmax(0,1fr) auto" : "minmax(0,1fr)" } satisfies CSSProperties;
  const mediaColumnStyle = usesRailMedia
    ? { gridTemplateColumns: `${resolvedMediaRailWidth}px minmax(0,1fr)` } satisfies CSSProperties
    : usesInlineMedia
      ? { gridTemplateColumns: "auto minmax(0,1fr)" } satisfies CSSProperties
      : undefined;

  const bodyContent = (
    <div
      className={cn(
        "relative grid w-full min-w-0 items-stretch gap-[var(--exercise-row-gap)] overflow-hidden",
        styles.shell,
        badgeText ? (resolvedDensity === "compact" ? "pt-2.5" : "pt-3") : undefined,
        usesRailMedia ? styles.shellWithMedia : "pl-[var(--exercise-row-shell-padding-x)]",
        bodyClassName,
      )}
      style={bodyGridStyle}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]",
          cardAccentRailClassNames[resolvedSemanticTone],
        )}
      />
      <div className="grid min-w-0 items-stretch" style={mediaColumnStyle}>
        {usesRailMedia ? (
          <div
            className={cn(
              "relative -my-[var(--exercise-row-shell-padding-y-compact)] min-h-[calc(var(--exercise-row-media-min-height-compact)+(var(--exercise-row-shell-padding-y-compact)*2))] self-stretch overflow-hidden rounded-l-[inherit] border-r border-[rgb(var(--border-strong)/0.14)] transition-colors",
              resolvedDensity === "detailed"
                ? "-my-[var(--exercise-row-shell-padding-y-detailed)] min-h-[calc(var(--exercise-row-media-min-height-detailed)+(var(--exercise-row-shell-padding-y-detailed)*2))]"
                : undefined,
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

        <div className={cn("min-w-0 self-stretch py-0.5", contentClassName)}>
          <div
            className={cn(
              "flex min-h-full min-w-0 flex-col",
              hasSupportingContent ? "justify-start" : "justify-center",
              styles.contentGap,
              titleContainerClassName,
            )}
          >
            <p
              className={cn(
                "text-safe-wrap min-w-0 leading-tight [text-wrap:pretty]",
                styles.titleClamp,
                styles.titleSize,
                "font-semibold",
                titleStateClassNames[state],
                titleClassName,
              )}
            >
              {title}
            </p>
            {subtitle ? (
              <div className={cn("min-w-0", styles.goalRow)}>
                {subtitleLabel ? (
                  <p className={cn("mb-0.5", EXERCISE_CARD_LABEL_CLASS_NAME)}>
                    {subtitleLabel}
                  </p>
                ) : null}
                <div
                  className={cn(
                    EXERCISE_CARD_SUMMARY_CLASS_NAME,
                    styles.subtitleClamp,
                    subtitleStateClassNames[state],
                    subtitleClassName,
                  )}
                >
                  {subtitle}
                </div>
              </div>
            ) : null}
            {children ? (
              <div className={cn("min-w-0", styles.childrenSpacing)}>
                {children}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {hasRightIcon || badgeText ? (
        <div
          className={cn(
            "relative flex min-h-full min-w-[var(--exercise-row-trailing-min-width)] shrink-0 self-stretch justify-end",
            trailingClassName,
            rightRailClassName,
          )}
        >
          <div className={cn("flex min-h-full flex-col items-end", badgeText ? "justify-between gap-2 pt-0.5" : "justify-center")}>
            {badgeText ? (
              <span
                className={cn(
                  "pointer-events-none shrink-0",
                  EXERCISE_CARD_BADGE_CLASS_NAME,
                  badgeStateClassNames[state],
                  cardBadgeToneClassNames[resolvedSemanticTone],
                )}
              >
                {badgeText}
              </span>
            ) : null}
            {hasRightIcon ? (
            <div
              className={cn(
                EXERCISE_CARD_TRAILING_ICON_CLASS_NAME,
                badgeText ? "mt-auto" : undefined,
                trailingStackClassName,
              )}
            >
              {rightIcon}
            </div>
            ) : null}
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

  if (actions) {
    return (
      <Glass variant="base" interactive={!disabled} className={shellClassName}>
        <div className="flex w-full items-stretch gap-2">
          {onPress ? (
            <button
              type="button"
              {...buttonProps}
              className={cn("min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]", cardPressClassName)}
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
      <Glass variant="base" interactive={!disabled} className={shellClassName}>
        <button
          type="button"
          {...buttonProps}
          className={cn("block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]", cardPressClassName)}
          onClick={onPress}
          disabled={disabled}
        >
          {bodyContent}
        </button>
      </Glass>
    );
  }

  return (
    <Glass variant="base" className={shellClassName}>
      {bodyContent}
    </Glass>
  );
}

