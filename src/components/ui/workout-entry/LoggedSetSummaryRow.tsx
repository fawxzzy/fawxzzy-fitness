import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";

export function LoggedSetSummaryRow({
  label,
  summary,
  summaryItems,
  action,
  actionClassName,
  className,
  contentAlign = "left",
}: {
  label: ReactNode;
  summary: ReactNode;
  summaryItems?: ReactNode[];
  action?: ReactNode;
  actionClassName?: string;
  className?: string;
  contentAlign?: "left" | "center";
}) {
  const isCentered = contentAlign === "center";
  const resolvedSummary = summaryItems && summaryItems.length > 0
    ? (
      <div className={cn("flex min-h-[52px] items-center gap-2 px-4", isCentered ? "justify-center text-center" : "text-left")}>
        <div className={cn(appTokens.currentSessionSetSummaryLabel, "shrink-0", isCentered ? "text-center" : "text-left")}>
          {label}
        </div>
        <SignatureMiniPipe />
        <SignatureInlineList
          items={summaryItems}
          separator="dot"
          className={cn(
            appTokens.currentSessionLoggerSummaryText,
            "min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1 whitespace-normal break-words text-[14px] leading-[1.25]",
            isCentered ? "justify-center text-center" : "text-left",
          )}
          itemClassName="min-w-0"
        />
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
        "flex min-h-[52px] w-full items-stretch overflow-hidden transition-all duration-200 ease-out",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="min-w-0">{resolvedSummary}</div>
      </div>
      {action ? <div className={cn("flex shrink-0 items-stretch justify-end pr-3", actionClassName)}>{action}</div> : null}
    </div>
  );
}
