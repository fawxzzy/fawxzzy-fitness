"use client";

import { useEffect, useRef, useState } from "react";
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
  className?: string;
};

export function DayTaxonomyHeaderSummary({ dayName, summary, isRest, className }: Props) {
  const [summaryFits, setSummaryFits] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const { countsSummary } = getDayTaxonomyHeaderSummaryParts({
    dayName,
    summary,
    isRest,
  });

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

  return (
    <div ref={containerRef} className="relative flex min-w-0 w-full justify-center">
      <span ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 whitespace-nowrap text-sm">
        {countsSummary}
      </span>
      {summaryFits ? (
        <SubtitleText as="p" className={cn("w-full overflow-hidden text-center text-ellipsis whitespace-nowrap", className)}>
          {countsSummary}
        </SubtitleText>
      ) : (
        <SubtitleText as="p" className={cn("w-full text-center text-[13px] leading-[1.35] [text-wrap:pretty]", className)}>
          {countsSummary}
        </SubtitleText>
      )}
    </div>
  );
}
