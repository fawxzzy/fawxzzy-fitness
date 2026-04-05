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
  completed: "text-emerald-50",
  empty: "text-[rgb(var(--text)/0.92)]",
};

const subtitleStateClassNames: Record<ExerciseCardState, string> = {
  default: textRoles.subtitle,
  selected: "text-[rgb(var(--text)/0.7)]",
  active: "text-[rgb(var(--text)/0.64)]",
  completed: "text-emerald-100/76",
  empty: "text-[rgb(var(--text)/0.58)]",
};

const mediaShellStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/35",
  selected: "border-emerald-400/34 bg-emerald-400/8 shadow-[0_0_0_1px_rgba(96,200,130,0.12)]",
  active: "border-emerald-300/26 bg-[rgb(var(--bg)/0.12)] shadow-[0_0_0_1px_rgba(52,211,153,0.12)]",
  completed: "border-emerald-400/34 bg-emerald-400/8 shadow-[0_0_0_1px_rgba(52,211,153,0.16)]",
  empty: "border-dashed border-border/26 saturate-[0.78] opacity-80",
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
  default: "border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] hover:border-border/70 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  selected: "border-emerald-400/36 bg-[linear-gradient(180deg,rgba(96,200,130,0.12),rgba(96,200,130,0.04))] shadow-[0_14px_30px_-24px_rgba(96,200,130,0.46)] ring-1 ring-emerald-300/18 hover:border-emerald-400/46 hover:bg-[linear-gradient(180deg,rgba(96,200,130,0.14),rgba(96,200,130,0.06))]",
  active: "border-emerald-300/36 bg-[rgb(var(--surface-2-soft)/0.72)] shadow-[0_14px_32px_-26px_rgba(52,211,153,0.62)] ring-1 ring-emerald-300/18 hover:border-emerald-300/46 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  completed: "border-emerald-400/42 bg-[linear-gradient(180deg,rgba(52,211,153,0.2),rgba(16,185,129,0.08))] shadow-[0_14px_30px_-24px_rgba(16,185,129,0.85)] ring-1 ring-emerald-300/18 hover:border-emerald-400/52 hover:bg-[linear-gradient(180deg,rgba(52,211,153,0.22),rgba(16,185,129,0.1))]",
  empty: "border-dashed border-amber-300/28 bg-[linear-gradient(180deg,rgba(245,158,11,0.05),rgba(var(--surface-2-soft)/0.42))] hover:border-amber-300/38 hover:bg-[linear-gradient(180deg,rgba(245,158,11,0.07),rgba(var(--surface-2-soft)/0.5))]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-[rgb(var(--bg)/0.34)] text-[rgb(var(--text)/0.8)]",
  selected: "border-emerald-400/32 bg-emerald-400/10 text-emerald-100",
  active: "border-emerald-300/34 bg-emerald-400/10 text-emerald-100",
  completed: "border-emerald-400/36 bg-emerald-400/12 text-emerald-100",
  empty: "border-amber-300/30 bg-amber-400/10 text-amber-100",
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

  const pressableBodyClassName = "min-w-0 flex-1 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25";

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
