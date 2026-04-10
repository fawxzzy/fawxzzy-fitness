import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { textRoles } from "@/components/ui/text-roles";
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
  subtitleClamp: string;
  titleSize: string;
}> = {
  compact: {
    shell: "min-h-[96px] px-4 py-3",
    media: "h-14 w-14 rounded-[20px]",
    subtitleClamp: "line-clamp-1",
    titleSize: "text-[0.98rem]",
  },
  detailed: {
    shell: "min-h-[128px] px-4 py-4",
    media: "h-[72px] w-[72px] rounded-[22px]",
    subtitleClamp: "line-clamp-3",
    titleSize: "text-[clamp(1.02rem,2.5vw,1.08rem)]",
  },
};

const shellStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-rgb)/0.44)]",
  selected: "border-[rgb(var(--accent-blue)/0.3)] bg-[linear-gradient(180deg,rgba(137,182,242,0.12),rgba(137,182,242,0.04))] ring-1 ring-[rgb(var(--accent-blue)/0.14)]",
  active: "border-[rgb(var(--accent-mint)/0.3)] bg-[linear-gradient(180deg,rgba(127,216,195,0.12),rgba(127,216,195,0.04))] ring-1 ring-[rgb(var(--accent-mint)/0.14)]",
  completed: "border-[rgb(var(--accent-mint)/0.34)] bg-[linear-gradient(180deg,rgba(127,216,195,0.16),rgba(103,191,173,0.06))] ring-1 ring-[rgb(var(--accent-mint)/0.16)]",
  empty: "border-dashed border-[rgb(var(--accent-yellow-off)/0.24)] bg-[linear-gradient(180deg,rgba(200,179,95,0.06),rgba(42,53,72,0.2))]",
};

const thumbStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--bg)/0.08)]",
  selected: "border-[rgb(var(--accent-blue)/0.28)] bg-[rgb(var(--accent-blue)/0.08)]",
  active: "border-[rgb(var(--accent-mint)/0.28)] bg-[rgb(var(--accent-mint)/0.08)]",
  completed: "border-[rgb(var(--accent-mint)/0.3)] bg-[rgb(var(--accent-mint)/0.1)]",
  empty: "border-dashed border-[rgb(var(--accent-yellow-off)/0.24)] bg-[rgb(var(--accent-yellow-off)/0.08)]",
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
  selected: "text-[rgb(var(--text-secondary)/0.94)]",
  active: "text-[rgb(var(--text-secondary)/0.9)]",
  completed: "text-[rgb(var(--text-secondary)/0.96)]",
  empty: "text-[rgb(var(--text-muted)/0.95)]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--bg-panel)/0.55)] text-[rgb(var(--text-primary)/0.82)]",
  selected: "border-[rgb(var(--accent-blue)/0.28)] bg-[rgb(var(--accent-blue)/0.12)] text-[rgb(242_247_255)]",
  active: "border-[rgb(var(--accent-mint)/0.3)] bg-[rgb(var(--accent-mint)/0.12)] text-[rgb(244_249_248)]",
  completed: "border-[rgb(var(--accent-mint)/0.32)] bg-[rgb(var(--accent-mint)/0.14)] text-[rgb(244_249_248)]",
  empty: "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(255_246_214)]",
};

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text)/0.55)]" />;

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
}) {
  const resolvedDensity = density ?? densityByVariant[variant];
  const styles = densityStyles[resolvedDensity];
  const bodyGridClassName = leadingVisual
    ? "grid-cols-[auto_minmax(0,1fr)_auto]"
    : "grid-cols-[minmax(0,1fr)_auto]";

  const bodyContent = (
    <div
      className={cn(
        "grid w-full min-w-0 items-center gap-3",
        bodyGridClassName,
        styles.shell,
        bodyClassName,
      )}
    >
      {leadingVisual ? (
        <div
          className={cn(
            "relative shrink-0 self-stretch overflow-hidden border p-0 transition-colors",
            styles.media,
            thumbStateClassNames[state],
            mediaClassName,
          )}
        >
          {leadingVisual}
        </div>
      ) : null}

      <div className={cn("min-w-0 self-stretch", contentClassName)}>
        <div className={cn("min-w-0", titleContainerClassName)}>
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-safe-wrap min-w-0 flex-1 font-semibold leading-tight [text-wrap:pretty]",
                styles.titleSize,
                titleStateClassNames[state],
                titleClassName,
              )}
            >
              {title}
            </p>
            {badgeText ? (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none",
                  badgeStateClassNames[state],
                )}
              >
                {badgeText}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div
              className={cn(
                "text-safe-wrap mt-1 text-xs leading-[1.35] [text-wrap:pretty]",
                styles.subtitleClamp,
                subtitleStateClassNames[state],
                subtitleClassName,
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {children ? <div className="mt-2 min-w-0">{children}</div> : null}
      </div>

      <div
        className={cn(
          "flex min-h-full shrink-0 items-center justify-end self-stretch",
          trailingClassName,
          rightRailClassName,
        )}
      >
        <div className={cn("flex h-full min-w-10 items-center justify-end", trailingStackClassName)}>
          {rightIcon}
        </div>
      </div>
    </div>
  );

  const shellClassName = cn(
    "w-full max-w-none rounded-[var(--card-radius)] text-left",
    shellStateClassNames[state],
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  if (onPress && actions) {
    return (
      <Glass variant="base" interactive={!disabled} className={shellClassName}>
        <div className="flex w-full items-stretch gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]"
            onClick={onPress}
            disabled={disabled}
          >
            {bodyContent}
          </button>
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
