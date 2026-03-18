import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

export function ExerciseCard({
  title,
  subtitle,
  children,
  onPress,
  rightIcon = defaultChevron,
  badgeText,
  disabled = false,
  className,
  trailingClassName,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onPress?: () => void;
  rightIcon?: ReactNode;
  badgeText?: string;
  disabled?: boolean;
  className?: string;
  trailingClassName?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[1rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)] [overflow-wrap:anywhere]">
            {title}
          </p>
          {badgeText ? (
            <span className="shrink-0 rounded-full border border-border/60 bg-surface-2-soft px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--text)/0.74)]">
              {badgeText}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className={cn("min-w-0 text-[0.8rem] leading-snug whitespace-normal break-words", appTokens.metaText)}>{subtitle}</p> : null}
        {children}
      </div>
      <div className={cn("shrink-0 self-center text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", trailingClassName)}>{rightIcon}</div>
    </>
  );

  const baseClassName = cn(
    "flex w-full items-start justify-between gap-3.5 text-left",
    appTokens.rowBase,
    onPress ? appTokens.rowInteractive : undefined,
    appTokens.rowDefault,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  if (onPress) {
    return (
      <button
        type="button"
        className={cn(baseClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25")}
        onClick={onPress}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
