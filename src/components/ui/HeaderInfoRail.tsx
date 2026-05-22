import type { ReactNode } from "react";
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
}: {
  items: HeaderInfoRailItem[];
  ariaLabel?: string;
  emptyFallback?: ReactNode;
  className?: string;
}) {
  const visibleItems = items
    .map((item) => ({
      ...item,
      label: item.label.trim(),
    }))
    .filter((item) => item.label.length > 0 || (item.value !== null && item.value !== undefined && `${item.value}`.trim().length > 0));

  if (visibleItems.length === 0) {
    return emptyFallback;
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
