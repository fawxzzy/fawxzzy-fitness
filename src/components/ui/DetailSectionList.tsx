"use client";

import { Fragment } from "react";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";

export const THIN_SECTION_TOP_DIVIDER_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--metric-accent-rgb)/0.14),rgb(var(--metric-accent-rgb)/0.85),rgb(var(--metric-accent-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0]";

export type DetailSectionTone = "primary" | "muted";
export type DetailSectionSignalTone = "pr" | "promotion" | "watch" | "regression";
export type DetailSectionBadgeTone = DetailSectionSignalTone | "best" | "default";
export type DetailSectionSignalMap = Record<string, DetailSectionSignalTone | DetailSectionSignalTone[]>;
export type DetailSectionItemLayout = "auto" | "single-column";
export type DetailSectionItemsLayout = "grid" | "inline";
export type DetailSectionListItem = {
  id: string;
  primary: string;
  value?: string | null;
  meta?: string | null;
  rowClassName?: string;
  contentClassName?: string;
  signals?: DetailSectionSignalTone | DetailSectionSignalTone[] | null;
  tagLabels?: string[] | null;
  tone?: DetailSectionTone;
  layout?: DetailSectionItemLayout;
};
export type DetailSectionListItemInput = string | DetailSectionListItem;

export type DetailSectionListSection = {
  title: string;
  items: DetailSectionListItemInput[];
  tone?: DetailSectionTone;
  layout?: DetailSectionItemsLayout;
  sectionSignal?: DetailSectionSignalTone;
  itemSignals?: DetailSectionSignalMap;
  legendSignals?: DetailSectionSignalTone[];
};

const DETAIL_SECTION_BADGE_CONFIG = {
  pr: {
    label: "PR",
    textClassName: "text-[rgb(var(--secondary-action-rgb)/0.96)]",
    chipClassName: "border-[rgb(var(--secondary-action-rgb)/0.2)] bg-[rgb(var(--secondary-action-rgb)/0.1)] text-[rgb(var(--secondary-action-rgb)/0.96)]",
    dotClassName: "bg-[rgb(var(--secondary-action-rgb)/0.96)]",
  },
  promotion: {
    label: "PROMO",
    textClassName: "text-[rgb(var(--accent-divider-rgb)/0.96)]",
    chipClassName: "border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--accent-divider-rgb)/0.08)] text-[rgb(var(--accent-divider-rgb)/0.94)]",
    dotClassName: "bg-[rgb(var(--accent-divider-rgb)/0.96)]",
  },
  watch: {
    label: "WATCH",
    textClassName: "text-[rgb(var(--accent-yellow-on)/0.96)]",
    chipClassName: "border-[rgb(var(--accent-yellow-on)/0.18)] bg-[rgb(var(--accent-yellow-on)/0.08)] text-[rgb(var(--accent-yellow-on)/0.94)]",
    dotClassName: "bg-[rgb(var(--accent-yellow-on)/0.96)]",
  },
  regression: {
    label: "REG",
    textClassName: "text-[rgb(255,116,116)]",
    chipClassName: "border-[rgb(255,116,116,0.24)] bg-[rgb(255,116,116,0.1)] text-[rgb(255,116,116)]",
    dotClassName: "bg-[rgb(255,116,116)]",
  },
  best: {
    label: "BEST",
    textClassName: "text-[rgb(var(--accent-yellow-on)/0.96)]",
    chipClassName: "border-[rgb(var(--accent-yellow-on)/0.22)] bg-[rgb(var(--accent-yellow-on)/0.1)] text-[rgb(var(--accent-yellow-on)/0.96)]",
    dotClassName: "bg-[rgb(var(--accent-yellow-on)/0.96)]",
  },
  default: {
    label: "",
    textClassName: "text-[rgb(var(--text-secondary)/0.92)]",
    chipClassName: "border-[rgb(var(--border-rgb)/0.32)] bg-[rgb(var(--surface-2-rgb)/0.3)] text-[rgb(var(--text-secondary)/0.9)]",
    dotClassName: "bg-[rgb(var(--text-secondary)/0.9)]",
  },
} satisfies Record<DetailSectionBadgeTone, {
  label: string;
  textClassName: string;
  chipClassName: string;
  dotClassName: string;
}>;

function normalizeSignalTones(value?: DetailSectionSignalTone | DetailSectionSignalTone[] | null) {
  const tones = Array.isArray(value) ? value : value ? [value] : [];
  return tones.filter((tone, index, values): tone is DetailSectionSignalTone => Boolean(tone) && values.indexOf(tone) === index);
}

export function resolveDetailSectionBadgeTone(label: string): DetailSectionBadgeTone {
  const normalized = label.trim().toUpperCase();
  if (normalized === "PR") return "pr";
  if (normalized === "PROMO" || normalized === "PROMOTION") return "promotion";
  if (normalized === "WATCH") return "watch";
  if (normalized === "REG" || normalized === "REGRESS" || normalized === "REGRESSION") return "regression";
  if (normalized === "BEST") return "best";
  return "default";
}

export function DetailSectionBadge({
  label,
  tone,
}: {
  label: string;
  tone?: DetailSectionBadgeTone;
}) {
  const resolvedTone = tone ?? resolveDetailSectionBadgeTone(label);
  const config = DETAIL_SECTION_BADGE_CONFIG[resolvedTone];
  const displayLabel = config.label || label;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
        config.chipClassName,
      )}
    >
      {displayLabel}
    </span>
  );
}

function renderSignalChips(signals: DetailSectionSignalTone[]) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {signals.map((signal) => {
        return (
          <DetailSectionBadge
            key={signal}
            label={DETAIL_SECTION_BADGE_CONFIG[signal].label}
            tone={signal}
          />
        );
      })}
    </span>
  );
}

function renderTagChips(labels: string[] | null | undefined) {
  const normalizedLabels = (labels ?? []).map((label) => label.trim()).filter(Boolean);
  if (normalizedLabels.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {normalizedLabels.map((label) => (
        <DetailSectionBadge key={label} label={label} />
      ))}
    </span>
  );
}

function getArrowToneClassName(item: string) {
  const normalized = item.toLowerCase();
  const transitionMatch = normalized.match(/(.+?)(?:->|\u2192)(.+)/);
  if (transitionMatch) {
    const leftScore = (transitionMatch[1].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    const rightScore = (transitionMatch[2].match(/-?\d+(?:\.\d+)?/g) ?? []).reduce((sum, part) => sum + Number(part), 0);
    if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && rightScore !== leftScore) {
      return rightScore > leftScore ? "text-[rgb(var(--success-rgb)/0.94)]" : "text-[rgb(255,116,116)]";
    }
  }

  if (/\b(matched|match|same|flat|steady|held|no change)\b/.test(normalized)) {
    return "text-[rgb(var(--accent-yellow-on)/0.96)]";
  }

  if (/\b(reduced|removed|regression|regressed|revert|reverted|deload|decreased|down|below|slipped)\b/.test(normalized)) {
    return "text-[rgb(255,116,116)]";
  }

  if (/\b(increased|added|promotion|promoted|improved|up|new best|pr)\b/.test(normalized)) {
    return "text-[rgb(var(--success-rgb)/0.94)]";
  }

  return "text-[rgb(var(--text-primary)/0.95)]";
}

function normalizeDetailSectionItem(input: DetailSectionListItemInput, index: number): DetailSectionListItem | null {
  if (typeof input === "string") {
    const primary = normalizeDecoratedText(input).trim();
    if (!primary) {
      return null;
    }

    return {
      id: `${primary}-${index}`,
      primary,
      layout: "auto",
    };
  }

  if (!input || typeof input.primary !== "string") {
    return null;
  }

  const primary = normalizeDecoratedText(input.primary).trim();
  if (!primary) {
    return null;
  }

  return {
    id: input.id?.trim() || `${primary}-${index}`,
    primary,
    value: typeof input.value === "string" ? normalizeDecoratedText(input.value).trim() : input.value ?? null,
    meta: typeof input.meta === "string" ? normalizeDecoratedText(input.meta).trim() : input.meta ?? null,
    rowClassName: typeof input.rowClassName === "string" ? input.rowClassName : undefined,
    contentClassName: typeof input.contentClassName === "string" ? input.contentClassName : undefined,
    signals: input.signals ?? null,
    tagLabels: Array.isArray(input.tagLabels) ? input.tagLabels.filter((label) => typeof label === "string" && label.trim().length > 0) : null,
    tone: input.tone,
    layout: input.layout ?? "auto",
  };
}

function buildDetailSectionItemSignature(item: DetailSectionListItem) {
  return [item.primary, item.value ?? "", item.meta ?? ""].join("::").toLowerCase();
}

function buildDetailSectionItemText(item: DetailSectionListItem) {
  const parts = [item.primary, item.value].filter((part): part is string => Boolean(part?.trim()));
  return parts.join(" | ");
}

function renderSlashSeparatedText(part: string, keyPrefix: string) {
  if (!part.includes(" / ")) {
    return null;
  }

  const slashParts = part.split(/\s+\/\s+/).map((value) => value.trim()).filter(Boolean);
  if (slashParts.length <= 1) {
    return null;
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
      {slashParts.map((slashPart, slashIndex) => (
        <Fragment key={`${keyPrefix}-${slashPart}-${slashIndex}`}>
          {slashIndex > 0 ? <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">/</span> : null}
          <span className="min-w-0">{slashPart}</span>
        </Fragment>
      ))}
    </span>
  );
}

function renderLabeledColonText(part: string, key: string) {
  const match = part.match(/^(Target|Logged):\s*(.+)$/i);
  if (!match) {
    return null;
  }

  return (
    <span key={key} className="min-w-0">
      <span>{match[1]}</span>
      <span className="text-[rgb(var(--accent-divider-rgb)/0.96)]">:</span>
      <span> {renderSlashSeparatedText(match[2], `${key}-slash`) ?? match[2]}</span>
    </span>
  );
}

function renderDetailSectionItemContent(item: string) {
  const normalized = normalizeDecoratedText(item);
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
        const normalizedToken = part.trim().toUpperCase();
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

        if (part.includes("\u2192") || part.includes("->")) {
          const arrowParts = part.split(/(?:\u2192|->)/);
          return (
            <span key={`${part}-${index}`} className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              {arrowParts.map((arrowPart, arrowIndex) => (
                <Fragment key={`${arrowPart}-${arrowIndex}`}>
                  {arrowIndex > 0 ? <span className={cn("px-1", arrowToneClassName)}>&rarr;</span> : null}
                  {arrowPart ? <span className="min-w-0">{arrowPart.trim()}</span> : null}
                </Fragment>
              ))}
            </span>
          );
        }

        const labeledText = renderLabeledColonText(part, `${part}-${index}`);
        if (labeledText) {
          return labeledText;
        }

        const slashSeparatedText = renderSlashSeparatedText(part, `${part}-${index}`);
        if (slashSeparatedText) {
          return <span key={`${part}-${index}`} className="min-w-0">{slashSeparatedText}</span>;
        }

        if (
          normalizedToken === "AUTO"
          || normalizedToken === "MANUAL"
          || normalizedToken === "SESSION"
          || normalizedToken === "SET"
        ) {
          return (
            <span
              key={`${part}-${index}`}
              className={cn(
                "min-w-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em]",
                normalizedToken === "AUTO"
                  ? "text-[rgb(var(--accent-strong)/0.98)]"
                  : normalizedToken === "MANUAL"
                    ? "text-[rgb(var(--accent-yellow-on)/0.96)]"
                    : "text-[rgb(var(--accent-divider-rgb)/0.96)]",
              )}
            >
              {normalizedToken}
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
  layout = "grid",
  itemSignals,
  sectionSignal,
}: {
  items: DetailSectionListItemInput[];
  tone?: DetailSectionTone;
  className?: string;
  showBullets?: boolean;
  layout?: DetailSectionItemsLayout;
  itemSignals?: DetailSectionSignalMap;
  sectionSignal?: DetailSectionSignalTone;
}) {
  const normalizedItems = items
    .map((item, index) => normalizeDetailSectionItem(item, index))
    .filter((item): item is DetailSectionListItem => Boolean(item));
  const shouldUseTwoColumnGrid = normalizedItems.length > 1;

  if (layout === "inline") {
    return (
      <ul data-detail-items="inline" className={cn("m-0 flex min-w-0 list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0", className)}>
        {normalizedItems.map((item, index) => {
          const rowText = buildDetailSectionItemText(item);
          const normalizedItem = normalizeDecoratedText(rowText);
          const signals = normalizeSignalTones(item.signals ?? itemSignals?.[item.primary] ?? itemSignals?.[buildDetailSectionItemSignature(item)] ?? sectionSignal);
          const primarySignal = signals[0] ?? null;
          const shouldRenderDecoratedContent = normalizedItem.includes("|")
            || normalizedItem.includes("\u2022")
            || normalizedItem.includes("\u2192")
            || normalizedItem.includes("->");

          return (
            <li
              key={item.id || `${rowText}-${index}`}
              className={cn("inline-grid min-w-0 max-w-full justify-items-center", item.rowClassName)}
            >
              <div className="flex min-w-0 items-start justify-center text-center">
                <span className="min-w-0 text-center">
                  <span
                    className={cn(
                      appTokens.workoutCardDetailCompact,
                      "min-w-0 block text-center text-[12.5px] leading-[1.28] [overflow-wrap:anywhere]",
                      (item.tone ?? tone) === "muted" ? "text-[rgb(var(--text-secondary)/0.9)]" : "text-[rgb(var(--text-primary)/0.95)]",
                      primarySignal ? DETAIL_SECTION_BADGE_CONFIG[primarySignal].textClassName : undefined,
                      item.contentClassName,
                    )}
                  >
                    {shouldRenderDecoratedContent ? renderDetailSectionItemContent(normalizedItem) : normalizedItem}
                  </span>
                  {item.meta ? (
                    <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-[rgb(var(--text-secondary)/0.9)] [overflow-wrap:anywhere]">
                      {renderDetailSectionItemContent(item.meta)}
                    </span>
                  ) : null}
                </span>
              </div>
              {item.tagLabels?.length || signals.length > 0 ? (
                <span className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-1 text-center">
                  {renderTagChips(item.tagLabels)}
                  {renderSignalChips(signals)}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul data-detail-items="grid" className={cn("m-0 list-none p-0", shouldUseTwoColumnGrid ? "grid grid-cols-2 gap-x-3 gap-y-1.5 pl-px" : "space-y-1.5 pl-px", className)}>
      {normalizedItems.map((item, index) => {
        const rowText = buildDetailSectionItemText(item);
        const normalizedItem = normalizeDecoratedText(rowText);
        const signals = normalizeSignalTones(item.signals ?? itemSignals?.[item.primary] ?? itemSignals?.[buildDetailSectionItemSignature(item)] ?? sectionSignal);
        const primarySignal = signals[0] ?? null;
        const pipeSegments = normalizedItem
          .split("|")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const shouldSpanFullWidth = !shouldUseTwoColumnGrid
          || item.layout === "single-column"
          || Boolean(item.meta)
          || normalizedItem.length > 44
          || normalizedItem.includes(":")
          || pipeSegments.length > 3
          || pipeSegments.some((segment) => segment.length > 16);
        const shouldRenderDecoratedContent = normalizedItem.includes("|")
          || normalizedItem.includes("\u2022")
          || normalizedItem.includes("\u2192")
          || normalizedItem.includes("->");

        return (
          <li
            key={item.id || `${rowText}-${index}`}
            className={cn(
              "flex min-w-0 items-start",
              showBullets ? "gap-2.5" : "gap-0",
              shouldSpanFullWidth ? "col-span-2" : "col-span-1",
              item.rowClassName,
            )}
          >
            {showBullets ? (
              <div className="flex h-[1.05rem] shrink-0 items-center pt-[0.08rem]">
                <SignatureDot />
              </div>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-1">
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    appTokens.workoutCardDetailCompact,
                    "min-w-0 block text-[12.5px] leading-[1.28] [text-wrap:pretty]",
                    (item.tone ?? tone) === "muted" ? "text-[rgb(var(--text-secondary)/0.9)]" : "text-[rgb(var(--text-primary)/0.95)]",
                    primarySignal ? DETAIL_SECTION_BADGE_CONFIG[primarySignal].textClassName : undefined,
                    item.contentClassName,
                  )}
                >
                  {shouldRenderDecoratedContent ? renderDetailSectionItemContent(normalizedItem) : normalizedItem}
                </span>
                {item.meta ? (
                  <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-[rgb(var(--text-secondary)/0.9)]">
                    {renderDetailSectionItemContent(item.meta)}
                  </span>
                ) : null}
              </span>
              <span className="inline-flex flex-wrap items-center gap-1">
                {renderTagChips(item.tagLabels)}
                {renderSignalChips(signals)}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
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
  layout = "grid",
  itemSignals,
  sectionSignal,
  legendSignals,
}: {
  title: string;
  items: DetailSectionListItemInput[];
  tone?: DetailSectionTone;
  className?: string;
  divider?: boolean;
  titleClassName?: string;
  showBullets?: boolean;
  layout?: DetailSectionItemsLayout;
  itemSignals?: DetailSectionSignalMap;
  sectionSignal?: DetailSectionSignalTone;
  legendSignals?: DetailSectionSignalTone[];
}) {
  if (items.length === 0) {
    return null;
  }

  const resolvedSectionSignal = sectionSignal;
  const resolvedLegendSignals = normalizeSignalTones(legendSignals);

  return (
    <div className={cn("w-full space-y-1.5", divider ? "pt-[0.45rem]" : undefined, divider ? THIN_SECTION_TOP_DIVIDER_CLASS_NAME : undefined, className)}>
      <div className="w-full space-y-1">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-1">
          <span aria-hidden="true" className="justify-self-start" />
          <p className={cn("justify-self-center text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.96)]", titleClassName)}>
            {title}
          </p>
          <span className="justify-self-end">
            {renderSignalChips(resolvedLegendSignals)}
          </span>
        </div>
        <DetailSectionItems
          items={items}
          tone={tone}
          showBullets={showBullets}
          layout={layout}
          itemSignals={itemSignals}
          sectionSignal={resolvedSectionSignal}
        />
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
        layout={section.layout}
        titleClassName={titleClassName}
        itemSignals={section.itemSignals}
        sectionSignal={section.sectionSignal}
        legendSignals={section.legendSignals}
      />
    );
  });
}
