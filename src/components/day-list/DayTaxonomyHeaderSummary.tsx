"use client";

import { Fragment } from "react";
import { useEffect, useRef, useState } from "react";
import { SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";
import { getDayTaxonomyHeaderSummaryParts } from "@/lib/day-summary";

type Props = {
  dayName: string;
  summary: {
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  isRest: boolean;
  includeDayName?: boolean;
  className?: string;
};

export function DayTaxonomyHeaderSummary({ dayName, summary, isRest, includeDayName = false, className }: Props) {
  const [summaryFits, setSummaryFits] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const { dayName: resolvedDayName, countsSummary, compactSummary } = getDayTaxonomyHeaderSummaryParts({
    dayName,
    summary,
    isRest,
  });
  const displayedSummary = includeDayName ? compactSummary : countsSummary;

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recalculate = () => {
      const availableWidth = container.clientWidth;
      const summaryWidth = measure.scrollWidth;
      setSummaryFits(summaryWidth <= availableWidth);
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [countsSummary]);

  const renderDotSeparatedSummary = (text: string, itemClassName: string) => {
    const parts = text
      .split("•")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      return text;
    }

    return (
      <span className="inline-flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {parts.map((part, index) => (
          <Fragment key={`${part}-${index}`}>
            {index > 0 ? <SignatureDot /> : null}
            <span className={itemClassName}>{part}</span>
          </Fragment>
        ))}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 w-full justify-center">
      <span ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 whitespace-nowrap text-sm">
        {displayedSummary}
      </span>
      {summaryFits ? (
        <SubtitleText as="p" className={cn("w-full overflow-hidden text-center text-ellipsis whitespace-nowrap", className)}>
          {renderDotSeparatedSummary(displayedSummary, "min-w-0")}
        </SubtitleText>
      ) : includeDayName ? (
        <div className={cn("w-full space-y-0.5 text-center", className)}>
          <SubtitleText as="p" className="text-[13px] font-medium leading-[1.25] text-[rgb(var(--text-secondary)/0.98)]">
            {resolvedDayName}
          </SubtitleText>
          <SubtitleText as="p" className="text-[12px] leading-[1.3] text-[rgb(var(--text-muted)/0.92)]">
            {renderDotSeparatedSummary(countsSummary, "min-w-0")}
          </SubtitleText>
        </div>
      ) : (
        <SubtitleText as="p" className={cn("w-full text-center text-[13px] leading-[1.35] [text-wrap:pretty]", className)}>
          {renderDotSeparatedSummary(countsSummary, "min-w-0")}
        </SubtitleText>
      )}
    </div>
  );
}
