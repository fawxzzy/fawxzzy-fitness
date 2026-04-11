import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { textRoles } from "@/components/ui/text-roles";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardMediaToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

export type ExerciseCardVariant = "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
export type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";
export type ExerciseCardDensity = "compact" | "detailed";

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
  media: string;
  mediaFrame: string;
  titleClamp: string;
  subtitleClamp: string;
  titleSize: string;
}> = {
  compact: {
    shell: "min-h-[var(--exercise-row-min-height-compact)] px-[var(--exercise-row-shell-padding-x)] py-[var(--exercise-row-shell-padding-y-compact)]",
    media: "h-full w-full",
    mediaFrame: "-my-[var(--exercise-row-shell-padding-y-compact)] -ml-[var(--exercise-row-shell-padding-x)] mr-0.5 w-[var(--exercise-row-media-width-compact)] min-h-[var(--exercise-row-media-min-height-compact)] rounded-l-[calc(var(--card-radius)-1px)] rounded-r-[var(--exercise-row-media-radius-compact)]",
    titleClamp: "line-clamp-2",
    subtitleClamp: "line-clamp-1",
    titleSize: "text-[0.98rem]",
  },
  detailed: {
    shell: "min-h-[var(--exercise-row-min-height-detailed)] px-[var(--exercise-row-shell-padding-x)] py-[var(--exercise-row-shell-padding-y-detailed)]",
    media: "h-full w-full",
    mediaFrame: "-my-[var(--exercise-row-shell-padding-y-detailed)] -ml-[var(--exercise-row-shell-padding-x)] mr-1 w-[var(--exercise-row-media-width-detailed)] min-h-[var(--exercise-row-media-min-height-detailed)] rounded-l-[calc(var(--card-radius)-1px)] rounded-r-[var(--exercise-row-media-radius-detailed)]",
    titleClamp: "line-clamp-2",
    subtitleClamp: "line-clamp-1",
    titleSize: "text-[clamp(1rem,2.35vw,1.05rem)]",
  },
};

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
  variant = "standard",
  state = "default",
  density,
  semanticTone,
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
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
  density?: ExerciseCardDensity;
  semanticTone?: CardSemanticTone;
}) {
  const resolvedDensity = density ?? densityByVariant[variant];
  const styles = densityStyles[resolvedDensity];
  const resolvedSemanticTone = semanticTone ?? resolveDefaultSemanticTone(state);
  const bodyGridClassName = leadingVisual
    ? "grid-cols-[auto_minmax(0,1fr)_auto]"
    : "grid-cols-[minmax(0,1fr)_auto]";
  const hasBadge = Boolean(badgeText);
  const hasRightIcon = rightIcon !== null && rightIcon !== undefined;
  const trailingStackLayoutClassName = hasBadge && hasRightIcon
    ? "min-h-full flex-col justify-between"
    : hasBadge
      ? "min-h-full flex-col justify-start"
      : "items-center justify-center";

  const bodyContent = (
    <div
      className={cn(
        "relative grid w-full min-w-0 items-stretch gap-[var(--exercise-row-gap)] overflow-hidden",
        bodyGridClassName,
        styles.shell,
        bodyClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]",
          cardAccentRailClassNames[resolvedSemanticTone],
        )}
      />
      {leadingVisual ? (
        <div
          className={cn(
            "relative shrink-0 self-stretch overflow-hidden border p-0 transition-colors",
            styles.mediaFrame,
            thumbStateClassNames[state],
            cardMediaToneClassNames[resolvedSemanticTone],
            mediaClassName,
          )}
        >
          <div className={styles.media}>{leadingVisual}</div>
        </div>
      ) : null}

      <div className={cn("min-w-0 self-stretch py-0.5", contentClassName)}>
        <div className={cn("flex min-h-full min-w-0 flex-col justify-center", titleContainerClassName)}>
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
            <div
              className={cn(
                "text-safe-wrap mt-1.5 pr-1 text-xs leading-[1.35] [text-wrap:pretty]",
                styles.subtitleClamp,
                subtitleStateClassNames[state],
                subtitleClassName,
              )}
            >
              {subtitle}
            </div>
          ) : null}
          {children ? <div className="mt-2 min-w-0">{children}</div> : null}
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-full min-w-[var(--exercise-row-trailing-min-width)] shrink-0 items-stretch justify-end self-stretch",
          trailingClassName,
          rightRailClassName,
        )}
      >
        <div
          className={cn(
            "flex h-full min-w-[var(--exercise-row-trailing-min-width)] items-end gap-[var(--exercise-row-badge-gap)]",
            trailingStackLayoutClassName,
            trailingStackClassName,
          )}
        >
          {badgeText ? (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none",
                badgeStateClassNames[state],
                cardBadgeToneClassNames[resolvedSemanticTone],
              )}
            >
              {badgeText}
            </span>
          ) : null}
          {hasRightIcon ? <div className="flex min-h-10 items-center justify-end">{rightIcon}</div> : null}
        </div>
      </div>
    </div>
  );

  const shellClassName = cn(
    "w-full max-w-none rounded-[var(--card-radius)] text-left",
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
              className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]"
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
          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]"
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
