import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

export function LoggedSetSummaryRow({
  label,
  summary,
  summaryItems,
  action,
  actionClassName,
  className,
  contentAlign = "left",
  balanceActionSpace = false,
  showBottomSeparator = false,
}: {
  label: ReactNode;
  summary: ReactNode;
  summaryItems?: ReactNode[];
  action?: ReactNode;
  actionClassName?: string;
  className?: string;
  contentAlign?: "left" | "center";
  balanceActionSpace?: boolean;
  showBottomSeparator?: boolean;
}) {
  const isCentered = contentAlign === "center";
  const shouldBalanceActionSpace = balanceActionSpace && Boolean(action);
  const balancedRailClassName = "grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-1.5";
  const resolvedSummary = summaryItems && summaryItems.length > 0
    ? (
      <div
        className={cn(
          "min-h-[52px] px-4",
          shouldBalanceActionSpace ? balancedRailClassName : "flex items-center gap-2",
          isCentered ? "text-center" : "text-left",
        )}
      >
        <div className={cn("inline-flex min-w-0 items-center gap-2", shouldBalanceActionSpace ? "justify-start" : undefined, isCentered ? "text-center" : "text-left")}>
          <div className={cn(appTokens.currentSessionSetSummaryLabel, "shrink-0 whitespace-nowrap", isCentered ? "text-center" : "text-left")}>
            {label}
          </div>
          <SignatureMiniPipe />
        </div>
        <SignatureInlineList
          items={summaryItems}
          separator="dot"
          className={cn(
            appTokens.currentSessionLoggerSummaryText,
            "min-w-0 flex-wrap gap-x-2 gap-y-1 whitespace-normal break-words text-[14px] leading-[1.25]",
            shouldBalanceActionSpace ? "justify-center" : "flex-1",
            isCentered ? "text-center" : "text-left",
          )}
          itemClassName="min-w-0"
        />
        {shouldBalanceActionSpace ? (
          <div className={cn("flex items-center justify-end", actionClassName)}>
            {action}
          </div>
        ) : null}
      </div>
    )
    : (
      <div className={cn("flex min-h-[52px] items-center gap-3 px-4", isCentered ? "justify-center text-center" : "text-left")}>
        <div className={cn(appTokens.currentSessionSetSummaryLabel, "min-w-[2.9rem] shrink-0", isCentered ? "text-center" : "text-left")}>
          {label}
        </div>
        <div className={cn(appTokens.currentSessionLoggerSummaryText, "min-w-0 flex-1 whitespace-normal break-words text-[14px] leading-[1.25]", isCentered ? "text-center" : "text-left")}>
          {summary}
        </div>
      </div>
    );

  return (
    <div
      className={cn(
        "w-full overflow-hidden transition-all duration-200 ease-out",
        className,
      )}
    >
      <div className="flex min-h-[52px] w-full items-stretch">
        <div className="min-w-0 flex-1">
          <div className="min-w-0">{resolvedSummary}</div>
        </div>
        {action && !shouldBalanceActionSpace ? <div className={cn("flex min-w-[5.75rem] shrink-0 items-stretch justify-end pr-3", actionClassName)}>{action}</div> : null}
      </div>
      {showBottomSeparator ? (
        <div className="px-4 pb-0.5">
          <MetricAccentBar variant="thin" className="w-full opacity-85" />
        </div>
      ) : null}
    </div>
  );
}
