import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

export function AppRow({
  leftTop,
  leftBottom,
  rightTop,
  rightBottom,
  rightWrap = false,
  tone = "default",
  density = "default",
  onClick,
  className,
}: {
  leftTop: ReactNode;
  leftBottom?: ReactNode;
  rightTop?: ReactNode;
  rightBottom?: ReactNode;
  rightWrap?: boolean;
  tone?: "default" | "active";
  density?: "default" | "compact";
  onClick?: () => void;
  className?: string;
}) {
  const rowDensityClass = density === "compact" ? "px-3 py-2" : appTokens.rowBase;

  const content = (
    <>
      <div className={cn("min-w-0 space-y-1", rightWrap ? "shrink-0" : undefined)}>
        <div className="text-[0.96rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)]">{leftTop}</div>
        {leftBottom ? <div className={cn("text-xs leading-snug", appTokens.metaText)}>{leftBottom}</div> : null}
      </div>
      {(rightTop || rightBottom) ? (
        <div className={cn("min-w-0 text-right", rightWrap ? "flex-1" : "shrink-0")}>
          {rightTop ? (
            <div
              className={cn(
                "text-sm font-medium text-[rgb(var(--text)/0.98)]",
                rightWrap ? "whitespace-normal leading-tight [overflow-wrap:anywhere] [word-break:break-word]" : "leading-snug",
              )}
            >
              {rightTop}
            </div>
          ) : null}
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
          rowDensityClass,
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
    <div className={cn("flex items-start justify-between gap-3", rowDensityClass, className)}>
      {content}
    </div>
  );
}
