import type { ReactNode } from "react";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { splitWeekdayDisplayLabel } from "@/lib/header-meta";

function isRenderableNode(node: ReactNode) {
  if (node === null || node === undefined || node === false) {
    return false;
  }

  if (typeof node === "string") {
    return node.trim().length > 0;
  }

  return true;
}

export function RoutineDayHeaderTitle({
  leadingItems,
  dayLabel,
  className,
}: {
  leadingItems: ReactNode[];
  dayLabel?: string | null;
  className?: string;
}) {
  const visibleLeadingItems = leadingItems.filter(isRenderableNode);
  const normalizedDayLabel = String(dayLabel ?? "").trim();
  const dayParts = splitWeekdayDisplayLabel(normalizedDayLabel);

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {visibleLeadingItems.map((item, index) => (
        <span key={index} className="min-w-0">
          {item}
        </span>
      ))}
      {normalizedDayLabel ? (
        <>
          {visibleLeadingItems.length > 0 ? <SignatureMiniPipe /> : null}
          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn(appTokens.accentText, "text-[rgb(var(--accent-divider-rgb)/0.96)]")}>
              {dayParts?.weekday ?? normalizedDayLabel}
            </span>
            {dayParts?.remainder ? (
              <>
                <SignatureDot />
                <span>{dayParts.remainder}</span>
              </>
            ) : null}
          </span>
        </>
      ) : null}
    </span>
  );
}
