"use client";

import type { ReactNode } from "react";
import { AccentDotSeparatedText, SignatureDot, SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";

export function formatExerciseCardMetadataLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function buildExerciseCardMetadataItems(args: {
  primaryMuscle?: string | null;
  movementPattern?: string | null;
  equipment?: string | null;
}) {
  return [
    formatExerciseCardMetadataLabel(args.primaryMuscle),
    formatExerciseCardMetadataLabel(args.movementPattern),
    formatExerciseCardMetadataLabel(args.equipment),
  ].filter((value): value is string => Boolean(value));
}

export function ExerciseCardMetadataLine({
  items,
  className,
  highlightFirstItem = true,
}: {
  items: string[];
  className?: string;
  highlightFirstItem?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SignatureInlineList
      separator="pipe"
      className={cn(
        "!flex-nowrap min-w-0 max-w-full gap-x-1.5 gap-y-0 whitespace-nowrap text-[9.75px] font-medium leading-[1.16] text-[rgb(var(--text-secondary)/0.9)]",
        className,
      )}
      itemClassName="inline-flex shrink-0 items-center whitespace-nowrap leading-[1.12]"
      items={items.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={cn(
            "inline-flex min-w-0 items-center whitespace-nowrap",
            highlightFirstItem && index === 0 ? "text-[rgb(var(--accent-strong)/0.98)]" : undefined,
          )}
        >
          {value}
        </span>
      ))}
    />
  );
}

export function ExerciseCardProgressionStateInline({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const parts = normalizeDecoratedText(label)
    .split(/\s+\u2022\s+|\s+\|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center gap-x-1.5 gap-y-0 whitespace-nowrap", className)}>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-x-1.5 whitespace-nowrap">
          {index > 0 ? <SignatureDot className="h-[4px] w-[4px]" /> : null}
          <span
            className={cn(
              "text-[8.5px] font-semibold leading-none tracking-[0.12em]",
              part === "AUTO"
                ? "text-[rgb(var(--accent-strong)/0.98)]"
                : part === "MANUAL"
                  ? "text-[rgb(var(--accent-yellow-on)/0.96)]"
                  : "text-[rgb(var(--accent-divider-rgb)/0.96)]",
            )}
          >
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

function renderRightContent(content: ReactNode) {
  if (typeof content !== "string") {
    return content;
  }

  const normalized = normalizeDecoratedText(content).trim();
  if (!normalized) {
    return null;
  }

  return (
    <AccentDotSeparatedText
      text={normalized}
      className="min-w-0 max-w-full flex-nowrap items-center gap-x-1.5 whitespace-nowrap text-[9.75px] tracking-[0.01em] leading-[1.16] text-[rgb(var(--text-secondary)/0.88)]"
      itemClassName="shrink-0 whitespace-nowrap leading-[1.12]"
    />
  );
}

export function ExerciseCardStandardTitle({
  name,
  metadata,
  rightTitle = "Current Target",
  rightContent,
  rightAccessory,
  rightSubcontent,
  className,
  rightColumnClassName,
  rightContentClassName,
}: {
  name: string;
  metadata?: ReactNode;
  rightTitle?: ReactNode;
  rightContent?: ReactNode;
  rightAccessory?: ReactNode;
  rightSubcontent?: ReactNode;
  className?: string;
  rightColumnClassName?: string;
  rightContentClassName?: string;
}) {
  const resolvedRightContent = rightContent ? renderRightContent(rightContent) : null;
  const hasRightBlock = Boolean(resolvedRightContent) || Boolean(rightAccessory) || Boolean(rightSubcontent);

  return (
    <span className={cn("grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1.5 align-top", className)}>
      <span className="inline-flex min-w-0 max-w-full flex-1 flex-col justify-between">
        <span className="inline-flex min-w-0 max-w-full flex-col items-start justify-between gap-y-1 align-middle">
          <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
            <span className="min-w-0 max-w-full whitespace-normal break-words text-[0.98rem] font-semibold leading-[1.22] text-[rgb(var(--text)/0.98)]">
              {name}
            </span>
            <MetricAccentBar variant="thin" className="w-full opacity-80" />
          </span>
          {metadata}
        </span>
      </span>
      {hasRightBlock ? (
        <span className="inline-flex min-w-0 max-w-full shrink-0 items-stretch gap-1.25 self-start justify-self-start">
          <SignatureMiniPipe
            className="my-[1px] min-h-[3rem] h-auto self-stretch"
            barClassName="h-full"
          />
          <span className={cn("inline-flex min-w-fit max-w-full flex-col items-start justify-between gap-y-1 self-stretch text-left", rightColumnClassName)}>
            <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
              <span className="min-w-0 max-w-full whitespace-nowrap text-[0.9rem] font-semibold leading-[1.22] text-[rgb(var(--text)/0.92)]">
                {rightTitle}
              </span>
              <MetricAccentBar variant="thin" className="w-full opacity-75" />
            </span>
            <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-[9.75px] font-medium leading-[1.16] text-[rgb(var(--text-secondary)/0.88)]", rightContentClassName)}>
              {resolvedRightContent ? (
                <span className="inline-flex min-w-fit max-w-full items-center whitespace-nowrap">
                  {resolvedRightContent}
                </span>
              ) : null}
              {rightAccessory ? (
                <>
                  {resolvedRightContent ? <SignatureMiniPipe className="h-[0.82em] shrink-0 self-center" barClassName="h-full" /> : null}
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                    {rightAccessory}
                  </span>
                </>
              ) : null}
            </span>
            {rightSubcontent ? (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-[9.25px] font-medium leading-[1.16] text-[rgb(var(--text-secondary)/0.88)]">
                {rightSubcontent}
              </span>
            ) : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}
