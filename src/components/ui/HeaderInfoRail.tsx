 "use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { HeaderInfoRailItem } from "@/lib/header-info-rail";

function resolveToneClassName(tone: HeaderInfoRailItem["tone"]) {
  switch (tone) {
    case "accent":
    case "success":
      return "text-[rgb(var(--accent-divider-rgb)/0.98)]";
    case "warning":
      return "text-[rgb(var(--accent-yellow-on))]";
    case "muted":
      return appTokens.metaText;
    default:
      return "text-[rgb(var(--text-secondary)/0.96)]";
  }
}

function renderHeaderInfoRailItem(item: HeaderInfoRailItem) {
  const hasValue = item.value !== null && item.value !== undefined && `${item.value}`.trim().length > 0;
  if (!item.label.trim() && !hasValue) {
    return null;
  }

  const labelNode = item.label.trim().length > 0
    ? <span className={cn("min-w-0", hasValue && item.valuePosition !== "after" ? appTokens.metaText : "text-[rgb(var(--text-secondary)/0.96)]")}>{item.label}</span>
    : null;
  const valueNode = hasValue
    ? <span className={cn("min-w-0 font-medium", resolveToneClassName(item.tone))}>{item.value}</span>
    : null;

  return (
    <span title={item.title} className="inline-flex min-w-0 items-center gap-1.5">
      {item.valuePosition === "after" ? (
        <>
          {labelNode}
          {labelNode && valueNode ? <span className={appTokens.metaText}>:</span> : null}
          {valueNode}
        </>
      ) : (
        <>
          {valueNode}
          {labelNode}
        </>
      )}
    </span>
  );
}

export function HeaderInfoRail({
  items,
  ariaLabel,
  emptyFallback = null,
  className,
  behavior = "static",
  rotationMs = 3200,
}: {
  items: HeaderInfoRailItem[];
  ariaLabel?: string;
  emptyFallback?: ReactNode;
  className?: string;
  behavior?: "static" | "rotate-single";
  rotationMs?: number;
}) {
  const visibleItems = items
    .map((item) => ({
      ...item,
      label: item.label.trim(),
    }))
    .filter((item) => item.label.length > 0 || (item.value !== null && item.value !== undefined && `${item.value}`.trim().length > 0));

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleItems.length, behavior]);

  useEffect(() => {
    if (behavior !== "rotate-single" || visibleItems.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleItems.length);
    }, Math.max(1600, rotationMs));

    return () => window.clearInterval(intervalId);
  }, [behavior, rotationMs, visibleItems.length]);

  if (visibleItems.length === 0) {
    return emptyFallback;
  }

  if (behavior === "rotate-single") {
    const activeItem = visibleItems[activeIndex] ?? visibleItems[0];

    return (
      <span aria-label={ariaLabel} className="block w-full">
        <span className={cn("inline-flex w-full items-center justify-center text-[11.5px] leading-[1.22]", className)}>
          {renderHeaderInfoRailItem(activeItem)}
        </span>
      </span>
    );
  }

  return (
    <span aria-label={ariaLabel} className="block w-full">
      <SignatureInlineList
        items={visibleItems.map((item) => renderHeaderInfoRailItem(item))}
        className={cn("w-full min-w-0 flex-wrap text-[11.5px] leading-[1.22] [text-wrap:pretty]", className)}
      />
    </span>
  );
}
