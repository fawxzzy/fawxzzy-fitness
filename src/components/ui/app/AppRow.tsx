import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppRow({
  leftTop,
  leftBottom,
  rightTop,
  rightBottom,
  tone = "default",
  onClick,
  className,
}: {
  leftTop: ReactNode;
  leftBottom?: ReactNode;
  rightTop?: ReactNode;
  rightBottom?: ReactNode;
  tone?: "default" | "active";
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 space-y-1">
        <div className="text-[0.96rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)]">{leftTop}</div>
        {leftBottom ? <div className={cn("text-xs leading-snug", appTokens.metaText)}>{leftBottom}</div> : null}
      </div>
      {(rightTop || rightBottom) ? (
        <div className="min-w-0 shrink-0 text-right">
          {rightTop ? <div className="text-sm font-medium leading-snug text-[rgb(var(--text)/0.98)]">{rightTop}</div> : null}
          {rightBottom ? <div className={cn("pt-0.5 text-xs", appTokens.metaText)}>{rightBottom}</div> : null}
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-start justify-between gap-3 text-left",
          appTokens.rowBase,
          appTokens.rowInteractive,
          tone === "active" ? appTokens.rowAccent : appTokens.rowDefault,
          className,
        )}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("flex items-start justify-between gap-3", appTokens.rowBase, className)}>
      {content}
    </div>
  );
}
