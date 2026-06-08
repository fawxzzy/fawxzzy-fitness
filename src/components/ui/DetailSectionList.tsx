"use client";

import { Fragment } from "react";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";

export type DetailSectionTone = "primary" | "muted";

export type DetailSectionListSection = {
  title: string;
  items: string[];
  tone?: DetailSectionTone;
};

function getArrowToneClassName(item: string) {
  const normalized = item.toLowerCase();
  if (/\b(reduced|removed|regression|deload)\b/.test(normalized)) {
    return "text-[rgb(255,116,116)]";
  }

  if (/\b(increased|added|promotion|promoted)\b/.test(normalized)) {
    return "text-[rgb(var(--success-rgb)/0.94)]";
  }

  const transitionMatch = normalized.match(/(.+?)(?:->|→|â†’)(.+)/);
  if (transitionMatch) {
    const leftScore = (transitionMatch[1].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    const rightScore = (transitionMatch[2].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && rightScore !== leftScore) {
      return rightScore > leftScore ? "text-[rgb(var(--success-rgb)/0.94)]" : "text-[rgb(255,116,116)]";
    }
  }

  return "text-[rgb(var(--text-primary)/0.95)]";
}

function renderDetailSectionItemContent(item: string) {
  const normalized = String(item)
    .replaceAll("Ã¢â‚¬Â¢", "\u2022")
    .replaceAll("â€¢", "\u2022")
    .trim();
  const tokens = normalized
    .split(/(\s+\|\s+|\s+\u2022\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const arrowToneClassName = getArrowToneClassName(normalized);

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]">
      {tokens.map((part, index) => {
        if (part === "|") {
          return <SignatureMiniPipe key={`pipe-${index}`} />;
        }

        if (part === "\u2022") {
          const priorTextToken = [...tokens.slice(0, index)].reverse().find((token) => token !== "|" && token !== "\u2022");
          const shouldUsePipe = !tokens.includes("|")
            && typeof priorTextToken === "string"
            && /^\d+\s+set(s)?$/i.test(priorTextToken.trim());
          return shouldUsePipe
            ? <SignatureMiniPipe key={`pipe-${index}`} />
            : <SignatureDot key={`dot-${index}`} />;
        }

        if (part.includes("\u2192") || part.includes("->") || part.includes("â†’")) {
          const arrowParts = part.split(/(?:\u2192|->|â†’)/);
          return (
            <span key={`${part}-${index}`} className="min-w-0">
              {arrowParts.map((arrowPart, arrowIndex) => (
                <Fragment key={`${arrowPart}-${arrowIndex}`}>
                  {arrowIndex > 0 ? <span className={cn("px-1", arrowToneClassName)}>&rarr;</span> : null}
                  {arrowPart ? <span>{arrowPart.trim()}</span> : null}
                </Fragment>
              ))}
            </span>
          );
        }

        return <span key={`${part}-${index}`} className="min-w-0">{part}</span>;
      })}
    </span>
  );
}

export function DetailSectionItems({
  items,
  tone = "primary",
  className,
  showBullets = true,
}: {
  items: string[];
  tone?: DetailSectionTone;
  className?: string;
  showBullets?: boolean;
}) {
  const shouldUseTwoColumnGrid = items.length > 1;

  return (
    <div className={cn(shouldUseTwoColumnGrid ? "grid grid-cols-2 gap-x-3 gap-y-1.5 pl-px" : "space-y-1.5 pl-px", className)}>
      {items.map((item, index) => {
        const normalizedItem = item.trim();
        const pipeSegments = normalizedItem
          .split("|")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const shouldSpanFullWidth = !shouldUseTwoColumnGrid
          || normalizedItem.length > 44
          || normalizedItem.includes(":")
          || pipeSegments.length > 3
          || pipeSegments.some((segment) => segment.length > 16);

        return (
          <div
            key={`${item}-${index}`}
            className={cn(
              "flex min-w-0 items-start",
              showBullets ? "gap-2.5" : "gap-0",
              shouldSpanFullWidth ? "col-span-2" : "col-span-1",
            )}
          >
            {showBullets ? (
              <div className="flex h-[1.05rem] shrink-0 items-center pt-[0.08rem]">
                <SignatureDot />
              </div>
            ) : null}
            <span
              className={cn(
                appTokens.workoutCardDetailCompact,
                "min-w-0 flex-1 text-[12.5px] leading-[1.28] [text-wrap:pretty]",
                tone === "muted" ? "text-[rgb(var(--text-secondary)/0.9)]" : "text-[rgb(var(--text-primary)/0.95)]",
              )}
            >
              {(item.includes("|") || item.includes("\u2022") || item.includes("â€¢") || item.includes("\u2192") || item.includes("->") || item.includes("â†’"))
                ? renderDetailSectionItemContent(item)
                : item}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DetailSectionBlock({
  title,
  items,
  tone = "primary",
  className,
  divider = true,
  titleClassName,
  showBullets = true,
}: {
  title: string;
  items: string[];
  tone?: DetailSectionTone;
  className?: string;
  divider?: boolean;
  titleClassName?: string;
  showBullets?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full space-y-1.5", divider ? "pt-[0.45rem]" : undefined, divider ? THIN_SECTION_TOP_DIVIDER_CLASS_NAME : undefined, className)}>
      <div className="w-full space-y-1">
        <p className={cn("text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]", titleClassName)}>
          {title}
        </p>
        <DetailSectionItems items={items} tone={tone} showBullets={showBullets} />
      </div>
    </div>
  );
}

export function DetailSectionBlocks({
  sections,
  titleClassName,
}: {
  sections: DetailSectionListSection[];
  titleClassName?: string;
}) {
  return sections.map((section) => {
    if (!section || typeof section.title !== "string" || !Array.isArray(section.items)) {
      return null;
    }

    const items = section.items.filter(Boolean);
    if (items.length === 0) {
      return null;
    }

    return (
      <DetailSectionBlock
        key={section.title}
        title={section.title}
        items={items}
        tone={section.tone}
        titleClassName={titleClassName}
      />
    );
  });
}
