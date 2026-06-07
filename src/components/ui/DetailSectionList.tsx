"use client";

import { AccentDotSeparatedText, SignatureDot } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";

export type DetailSectionTone = "primary" | "muted";

export type DetailSectionListSection = {
  title: string;
  items: string[];
  tone?: DetailSectionTone;
};

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
              {item.includes("|") ? (
                <AccentDotSeparatedText text={item} />
              ) : (
                item
              )}
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
