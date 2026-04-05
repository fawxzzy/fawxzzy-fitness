"use client";

import { useEffect, useRef, useState } from "react";
import { SubtitleText } from "@/components/ui/text-roles";
import { getDayTaxonomyHeaderSummaryParts } from "@/lib/day-summary";

type Props = {
  dayName: string;
  summary: {
    strength: number;
    cardio: number;
    unknown: number;
  };
  isRest: boolean;
};

export function DayTaxonomyHeaderSummary({ dayName, summary, isRest }: Props) {
  const [compactFits, setCompactFits] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const { dayName: safeDayName, countsSummary, compactSummary } = getDayTaxonomyHeaderSummaryParts({
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
      const compactWidth = measure.scrollWidth;
      setCompactFits(compactWidth <= availableWidth);
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [compactSummary]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 whitespace-nowrap text-sm">
        {compactSummary}
      </span>
      {compactFits ? (
        <SubtitleText className="truncate whitespace-nowrap">{compactSummary}</SubtitleText>
      ) : (
        <div className="space-y-0.5">
          <SubtitleText className="truncate whitespace-nowrap">{safeDayName}</SubtitleText>
          <SubtitleText className="truncate whitespace-nowrap">{countsSummary}</SubtitleText>
        </div>
      )}
    </div>
  );
}
