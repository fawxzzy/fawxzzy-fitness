import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";
import { textRoles } from "@/components/ui/text-roles";

type ExerciseCardVariant = "compact" | "interactive" | "expanded" | "summary";
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

const leadingVisualStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/35",
  selected: "border-emerald-400/34 bg-emerald-400/8 shadow-[0_0_0_1px_rgba(96,200,130,0.12)]",
  active: "border-emerald-300/26 bg-[rgb(var(--bg)/0.12)] shadow-[0_0_0_1px_rgba(52,211,153,0.12)]",
  completed: "border-emerald-400/34 bg-emerald-400/8 shadow-[0_0_0_1px_rgba(52,211,153,0.16)]",
  empty: "border-dashed border-border/26 saturate-[0.78] opacity-80",
};

const variantClassNames: Record<ExerciseCardVariant, string> = {
  compact: "min-h-[5rem] px-4 py-3.5",
  interactive: "min-h-[5rem] px-3.5 py-3.5",
  expanded: "min-h-[5.1rem] px-3.5 py-3.5",
  summary: "min-h-[6rem] px-3.5 py-3.5",
};

const stateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] hover:border-border/70 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  selected: "border-emerald-400/36 bg-[linear-gradient(180deg,rgba(96,200,130,0.12),rgba(96,200,130,0.04))] shadow-[0_14px_30px_-24px_rgba(96,200,130,0.46)] ring-1 ring-emerald-300/16 hover:border-emerald-400/46 hover:bg-[linear-gradient(180deg,rgba(96,200,130,0.14),rgba(96,200,130,0.06))]",
  active: "border-emerald-300/36 bg-[rgb(var(--surface-2-soft)/0.72)] shadow-[0_14px_32px_-26px_rgba(52,211,153,0.62)] ring-1 ring-emerald-300/20 hover:border-emerald-300/46 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  completed: "border-emerald-400/42 bg-[linear-gradient(180deg,rgba(52,211,153,0.2),rgba(16,185,129,0.08))] shadow-[0_14px_30px_-24px_rgba(16,185,129,0.85)] hover:border-emerald-400/52 hover:bg-[linear-gradient(180deg,rgba(52,211,153,0.22),rgba(16,185,129,0.1))]",
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
  bodyClassName,
  contentClassName,
  titleContainerClassName,
  titleClassName,
  subtitleClassName,
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
  bodyClassName?: string;
  contentClassName?: string;
  titleContainerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
}) {
  const bodyContent = (
    <div className={cn("flex min-w-0 flex-1 items-start gap-3", bodyClassName)}>
      {leadingVisual ? <div className={cn("h-11 w-11 shrink-0 self-start rounded-[1rem] border bg-[rgb(var(--bg)/0.08)] p-0.5 pt-0.5 transition-colors [&_img]:transition [&_img]:duration-150", leadingVisualStateClassNames[state])}>{leadingVisual}</div> : null}
      <div className={cn("min-w-0 flex-1 space-y-1.5", contentClassName)}>
        <div className={cn("min-w-0 space-y-1", titleContainerClassName)}>
          <p className={cn("min-w-0 text-[0.98rem] font-semibold leading-snug whitespace-normal [word-break:normal]", titleStateClassNames[state], titleClassName)}>
            {title}
          </p>
          {subtitle ? <p className={cn("min-w-0 text-xs leading-snug whitespace-normal [word-break:normal]", subtitleStateClassNames[state], subtitleClassName)}>{subtitle}</p> : null}
        </div>
        {children}
      </div>
      <div className={cn("flex min-h-full min-w-[4.75rem] shrink-0 items-center justify-end self-stretch text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", trailingClassName)}>
        <div className="flex flex-col items-end gap-2">
          {badgeText ? (
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none", badgeStateClassNames[state])}>
              {badgeText}
            </span>
          ) : null}
          {rightIcon}
        </div>
      </div>
    </div>
  );

  const baseClassName = cn(
    "flex w-full items-start rounded-[1.25rem] border text-left",
    variantClassNames[variant],
    stateClassNames[state],
    onPress ? appTokens.rowInteractive : undefined,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  const bodyClassName = "min-w-0 flex-1 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25";

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
