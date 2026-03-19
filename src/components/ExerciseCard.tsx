import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

type ExerciseCardVariant = "compact" | "interactive" | "expanded" | "summary";
type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

const titleStateClassNames: Record<ExerciseCardState, string> = {
  default: "text-[rgb(var(--text)/0.98)]",
  selected: "text-[rgb(var(--text)/1)]",
  active: "text-white",
  completed: "text-emerald-50",
  empty: "text-[rgb(var(--text)/0.92)]",
};

const subtitleStateClassNames: Record<ExerciseCardState, string> = {
  default: appTokens.metaText,
  selected: "text-[rgb(var(--text)/0.74)]",
  active: "text-[rgb(var(--text)/0.78)]",
  completed: "text-emerald-100/78",
  empty: "text-[rgb(var(--text)/0.56)]",
};

const leadingVisualStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/35",
  selected: "border-accent/35 shadow-[0_0_0_1px_rgba(96,200,130,0.12)]",
  active: "border-white/16 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
  completed: "border-emerald-400/30 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]",
  empty: "border-border/22 saturate-[0.82] opacity-88",
};

const variantClassNames: Record<ExerciseCardVariant, string> = {
  compact: "min-h-[5rem] px-4 py-3.5",
  interactive: "min-h-[5rem] px-3.5 py-3.5",
  expanded: "min-h-[5.1rem] px-3.5 py-3.5",
  summary: "min-h-[6rem] px-3.5 py-3.5",
};

const stateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] hover:border-border/70 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  selected: "border-accent/45 bg-[linear-gradient(180deg,rgba(96,200,130,0.16),rgba(96,200,130,0.08))] shadow-[0_12px_30px_-18px_rgba(96,200,130,0.95)] ring-1 ring-accent/24 hover:border-accent/55 hover:bg-[linear-gradient(180deg,rgba(96,200,130,0.18),rgba(96,200,130,0.1))]",
  active: "border-sky-300/28 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(15,23,42,0.78))] shadow-[0_12px_30px_-22px_rgba(56,189,248,0.8)] ring-1 ring-sky-300/14 hover:border-sky-300/36 hover:bg-[linear-gradient(180deg,rgba(56,189,248,0.14),rgba(15,23,42,0.84))]",
  completed: "border-emerald-400/32 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(16,185,129,0.06))] hover:border-emerald-400/42 hover:bg-[linear-gradient(180deg,rgba(52,211,153,0.16),rgba(16,185,129,0.08))]",
  empty: "border-dashed border-border/38 bg-[rgb(var(--surface-2-soft)/0.46)] hover:border-border/48 hover:bg-[rgb(var(--surface-2-soft)/0.54)]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-surface/45 text-muted",
  selected: "border-accent/40 bg-accent/24 text-[rgb(var(--text)/0.98)]",
  active: "border-sky-300/30 bg-sky-300/16 text-sky-50",
  completed: "border-emerald-400/35 bg-emerald-400/14 text-emerald-50",
  empty: "border-border/30 bg-[rgb(var(--bg)/0.3)] text-[rgb(var(--text)/0.6)]",
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
  variant = "interactive",
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
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
}) {
  const bodyContent = (
    <>
      {leadingVisual ? <div className={cn("shrink-0 self-start rounded-[1rem] border bg-[rgb(var(--bg)/0.08)] p-0.5 pt-0.5 transition-colors [&_img]:transition [&_img]:duration-150", leadingVisualStateClassNames[state])}>{leadingVisual}</div> : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className={cn("min-w-0 text-[0.98rem] font-semibold leading-snug [overflow-wrap:anywhere]", titleStateClassNames[state])}>
              {title}
            </p>
            {subtitle ? <p className={cn("min-w-0 text-xs leading-snug whitespace-normal break-words", subtitleStateClassNames[state])}>{subtitle}</p> : null}
          </div>
          {badgeText ? (
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none", badgeStateClassNames[state])}>
              {badgeText}
            </span>
          ) : null}
        </div>
        {children}
      </div>
      {rightIcon ? <div className={cn("shrink-0 self-center text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", trailingClassName)}>{rightIcon}</div> : null}
    </>
  );

  const baseClassName = cn(
    "flex w-full items-start justify-between gap-3 rounded-[1.25rem] border text-left",
    variantClassNames[variant],
    stateClassNames[state],
    onPress ? appTokens.rowInteractive : undefined,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  const bodyClassName = "min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25";

  if (onPress && actions) {
    return (
      <article className={cn(baseClassName, "items-stretch gap-2") }>
        <button
          type="button"
          className={cn(bodyClassName, "min-w-0 flex-1")}
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
        className={cn(baseClassName, bodyClassName)}
        onClick={onPress}
        disabled={disabled}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={baseClassName}>{bodyContent}</div>;
}
