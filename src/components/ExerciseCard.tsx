import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import { textRoles } from "@/components/ui/text-roles";

type ExerciseCardVariant = "standard" | "compact" | "list" | "interactive" | "expanded" | "summary" | "reorder";
type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

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

const mediaShellStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)]",
  selected: "border-[rgb(var(--accent-blue)/0.28)] bg-[rgb(var(--accent-blue)/0.08)] shadow-[0_0_0_1px_rgba(137,182,242,0.1)]",
  active: "border-[rgb(var(--accent-mint)/0.28)] bg-[rgb(var(--accent-mint)/0.08)] shadow-[0_0_0_1px_rgba(127,216,195,0.1)]",
  completed: "border-[rgb(var(--accent-mint)/0.3)] bg-[rgb(var(--accent-mint)/0.1)] shadow-[0_0_0_1px_rgba(127,216,195,0.12)]",
  empty: "border-dashed border-[rgb(var(--accent-yellow-off)/0.24)] saturate-[0.82] opacity-84",
};

const mediaShellSizeClassNames: Record<ExerciseCardVariant, string> = {
  standard: "h-11 w-11 rounded-[0.95rem] p-0.5",
  compact: "h-11 w-11 rounded-[0.95rem] p-0.5",
  list: "h-11 w-11 rounded-[0.95rem] p-0.5",
  interactive: "h-11 w-11 rounded-[0.95rem] p-0.5",
  expanded: "h-11 w-11 rounded-[0.95rem] p-0.5",
  summary: "h-11 w-11 rounded-[0.95rem] p-0.5",
  reorder: "h-11 w-11 rounded-[0.95rem] p-0.5",
};

const variantClassNames: Record<ExerciseCardVariant, string> = {
  standard: "min-h-[4.35rem] px-3.5 py-2.75",
  compact: "min-h-[4.35rem] px-3.5 py-2.75",
  list: "min-h-[4.35rem] px-3.5 py-2.75",
  interactive: "min-h-[4.35rem] px-3.5 py-2.75",
  expanded: "min-h-[4.35rem] px-3.5 py-2.75",
  summary: "min-h-[4.35rem] px-3.5 py-2.75",
  reorder: "min-h-[4.35rem] px-3.5 py-2.75",
};

const rightRailWidthByVariant: Record<ExerciseCardVariant, string> = {
  standard: "w-[5.2rem] min-w-[5.2rem]",
  compact: "w-[5.2rem] min-w-[5.2rem]",
  list: "w-[5.2rem] min-w-[5.2rem]",
  interactive: "w-[5.2rem] min-w-[5.2rem]",
  expanded: "w-[5.2rem] min-w-[5.2rem]",
  summary: "w-[5.2rem] min-w-[5.2rem]",
  reorder: "w-[5.9rem] min-w-[5.9rem]",
};

const stateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-rgb)/0.44)] hover:border-[rgb(var(--border-strong)/0.26)] hover:bg-[rgb(var(--surface-rgb)/0.56)]",
  selected: "border-[rgb(var(--accent-blue)/0.3)] bg-[linear-gradient(180deg,rgba(137,182,242,0.12),rgba(137,182,242,0.04))] shadow-[0_14px_30px_-24px_rgba(137,182,242,0.32)] ring-1 ring-[rgb(var(--accent-blue)/0.14)] hover:border-[rgb(var(--accent-blue)/0.38)] hover:bg-[linear-gradient(180deg,rgba(137,182,242,0.14),rgba(137,182,242,0.05))]",
  active: "border-[rgb(var(--accent-mint)/0.3)] bg-[linear-gradient(180deg,rgba(127,216,195,0.12),rgba(127,216,195,0.04))] shadow-[0_14px_32px_-26px_rgba(127,216,195,0.34)] ring-1 ring-[rgb(var(--accent-mint)/0.14)] hover:border-[rgb(var(--accent-mint)/0.38)] hover:bg-[linear-gradient(180deg,rgba(127,216,195,0.14),rgba(127,216,195,0.05))]",
  completed: "border-[rgb(var(--accent-mint)/0.34)] bg-[linear-gradient(180deg,rgba(127,216,195,0.16),rgba(103,191,173,0.06))] shadow-[0_14px_30px_-24px_rgba(103,191,173,0.36)] ring-1 ring-[rgb(var(--accent-mint)/0.16)] hover:border-[rgb(var(--accent-mint)/0.4)] hover:bg-[linear-gradient(180deg,rgba(127,216,195,0.18),rgba(103,191,173,0.08))]",
  empty: "border-dashed border-[rgb(var(--accent-yellow-off)/0.24)] bg-[linear-gradient(180deg,rgba(200,179,95,0.06),rgba(42,53,72,0.2))] hover:border-[rgb(var(--accent-yellow-on)/0.32)] hover:bg-[linear-gradient(180deg,rgba(200,179,95,0.08),rgba(42,53,72,0.28))]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--bg-panel)/0.55)] text-[rgb(var(--text-primary)/0.82)]",
  selected: "border-[rgb(var(--accent-blue)/0.28)] bg-[rgb(var(--accent-blue)/0.12)] text-[rgb(242_247_255)]",
  active: "border-[rgb(var(--accent-mint)/0.3)] bg-[rgb(var(--accent-mint)/0.12)] text-[rgb(244_249_248)]",
  completed: "border-[rgb(var(--accent-mint)/0.32)] bg-[rgb(var(--accent-mint)/0.14)] text-[rgb(244_249_248)]",
  empty: "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(255_246_214)]",
};

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
}: {
  title: string;
  subtitle?: string;
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
}) {
  const bodyContent = (
    <div className={cn("grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden", bodyClassName)}>
      {leadingVisual ? (
        <div
          className={cn(
            "shrink-0 self-center overflow-hidden border bg-[rgb(var(--bg)/0.08)] transition-colors [&_img]:transition [&_img]:duration-150",
            mediaShellSizeClassNames[variant],
            mediaShellStateClassNames[state],
            mediaClassName,
          )}
        >
          {leadingVisual}
        </div>
      ) : null}

      <div className={cn("min-w-0 self-center space-y-1", contentClassName)}>
        <div className={cn("min-w-0 space-y-0.5", titleContainerClassName)}>
          <p className={cn("min-w-0 text-[0.98rem] font-semibold leading-[1.26] whitespace-normal [word-break:normal] [overflow-wrap:anywhere] [text-wrap:pretty]", titleStateClassNames[state], titleClassName)}>
            {title}
          </p>
          {subtitle ? <p className={cn("min-w-0 text-xs leading-[1.28] whitespace-normal [word-break:normal] [overflow-wrap:anywhere] [text-wrap:pretty]", subtitleStateClassNames[state], subtitleClassName)}>{subtitle}</p> : null}
        </div>
        {children}
      </div>

      <div className={cn("flex min-h-full min-w-0 shrink-0 justify-end self-stretch overflow-hidden text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", rightRailWidthByVariant[variant], rightRailClassName, trailingClassName)}>
        <div className={cn("grid h-full w-full min-w-0 grid-rows-[auto_1fr_auto] items-center justify-items-end gap-1 overflow-hidden py-0.5", trailingStackClassName)}>
          {badgeText ? (
            <span className={cn("max-w-full shrink-0 overflow-hidden text-ellipsis rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none text-right whitespace-nowrap", badgeStateClassNames[state])}>
              {badgeText}
            </span>
          ) : null}
          <span className="row-start-3 inline-flex h-7 min-w-7 items-center justify-center self-center leading-none">{rightIcon}</span>
        </div>
      </div>
    </div>
  );

  const baseClassName = cn(
    "flex w-full min-w-0 items-start overflow-hidden rounded-[1.25rem] border text-left",
    variantClassNames[variant],
    stateClassNames[state],
    onPress ? appTokens.rowInteractive : undefined,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  const pressableBodyClassName = "min-w-0 flex-1 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]";

  if (onPress && actions) {
    return (
      <article className={cn(baseClassName, "items-stretch gap-2")}>
        <button
          type="button"
          className={cn(pressableBodyClassName, "min-w-0 flex-1")}
          onClick={onPress}
          disabled={disabled}
        >
          {bodyContent}
        </button>
        <div className="flex shrink-0 items-start gap-1.5">{actions}</div>
      </article>
    );
  }

  if (onPress) {
    return (
      <button
        type="button"
        className={cn(baseClassName, pressableBodyClassName)}
        onClick={onPress}
        disabled={disabled}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={baseClassName}>{bodyContent}</div>;
}
