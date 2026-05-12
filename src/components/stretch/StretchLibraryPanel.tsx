"use client";

import type { UIEvent } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SearchField } from "@/components/ui/SearchField";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SignatureDot, SignatureInlineList, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { appTokens } from "@/components/ui/app/tokens";
import { EyebrowText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";
import { STRETCH_HUB_GUIDE_COPY, STRETCH_HUB_HERO_SRC } from "@/lib/stretch-library";
import { STRETCH_LIBRARY_FILTERS, queryStretchLibrary, type StretchLibraryFilterId } from "@/lib/stretch-library-index";
import { STRETCH_LIBRARY_SUMMARIES } from "@/lib/stretch-library-summaries";
import type { StretchReferenceDetail } from "@/lib/stretch-library-types";

const INITIAL_VISIBLE_STRETCHES = 8;
const VISIBLE_STRETCH_INCREMENT = 6;
const STRETCH_LOAD_MORE_THRESHOLD = 96;

function StretchMetaLine({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[11px] font-medium leading-[1.2] text-[rgb(var(--text-secondary)/0.94)]">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0 [text-wrap:balance]">{item}</span>
        </span>
      ))}
    </span>
  );
}

export function StretchLibraryPanel({
  context,
  heroCopy,
  heroImageSrc = STRETCH_HUB_HERO_SRC,
}: {
  context: "detail" | "session";
  heroCopy?: string | null;
  heroImageSrc?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<StretchLibraryFilterId>("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_STRETCHES);
  const [detailById, setDetailById] = useState<Record<string, StretchReferenceDetail>>({});
  const introCopy = context === "detail"
    ? (heroCopy?.trim() || STRETCH_HUB_GUIDE_COPY)
    : STRETCH_HUB_GUIDE_COPY;
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const hasActiveRefinements = normalizedQuery.length > 0 || selectedFilter !== "all";
  const activeFilterLabel = STRETCH_LIBRARY_FILTERS.find((filter) => filter.id === selectedFilter)?.label ?? "All stretches";
  const filteredStretches = useMemo(
    () => queryStretchLibrary({ filterId: selectedFilter, query: normalizedQuery }),
    [normalizedQuery, selectedFilter],
  );
  const visibleStretchIds = filteredStretches.slice(0, visibleCount).map((stretch) => stretch.id);
  const canLoadMore = visibleCount < filteredStretches.length;
  const visibleStretchCards = useMemo(
    () => filteredStretches.slice(0, visibleCount),
    [filteredStretches, visibleCount],
  );
  const isSessionContext = context === "session";

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_STRETCHES);
  }, [normalizedQuery, selectedFilter]);

  useEffect(() => {
    let cancelled = false;
    const unresolvedIds = visibleStretchIds.filter((id) => !detailById[id]);
    if (unresolvedIds.length === 0) {
      return;
    }

    void import("@/lib/stretch-library-details").then(({ getStretchReferenceDetailById }) => {
      if (cancelled) {
        return;
      }

      const nextEntries = unresolvedIds
        .map((id) => getStretchReferenceDetailById(id))
        .filter((detail): detail is StretchReferenceDetail => Boolean(detail));

      if (nextEntries.length === 0) {
        return;
      }

      setDetailById((current) => {
        const updates = Object.fromEntries(nextEntries.map((detail) => [detail.id, detail] as const));
        return { ...current, ...updates };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [detailById, visibleStretchIds]);

  function revealMoreStretches() {
    if (!canLoadMore) {
      return;
    }

    setVisibleCount((current) => Math.min(current + VISIBLE_STRETCH_INCREMENT, filteredStretches.length));
  }

  function handleViewportScroll(event: UIEvent<HTMLDivElement>) {
    if (!canLoadMore) {
      return;
    }

    const viewport = event.currentTarget;
    const remainingScroll = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (remainingScroll <= STRETCH_LOAD_MORE_THRESHOLD) {
      revealMoreStretches();
    }
  }

  const heroPanel = (
    <AppPanel
      className={cn(
        appTokens.detailSection,
        "gap-0 overflow-hidden border-transparent bg-transparent p-0 shadow-none",
        isSessionContext ? "sticky top-0 z-20 border-b border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgba(7,14,24,0.96)] backdrop-blur-md" : undefined,
      )}
    >
        <div className={cn(appTokens.detailMediaCard, "gap-0 overflow-hidden border-transparent bg-transparent p-0 shadow-none")}>
          <div className={cn(appTokens.detailMediaFrame, "border-transparent bg-transparent shadow-none")}>
            <ExerciseAssetImage
              src={heroImageSrc}
              alt="Stretch mobility illustration"
              className="h-full w-full"
              preferNaturalAspectRatio
              containerStyle={{ minHeight: context === "detail" ? "16rem" : "12rem", maxHeight: context === "detail" ? "24rem" : "16rem" }}
              imageClassName="object-contain object-center"
              imageStyle={{ padding: "clamp(0.4rem, 1.4vw, 0.75rem)" }}
              sizes="(max-width: 768px) 100vw, 520px"
              priority={context === "detail"}
            />
          </div>
          <div className="mx-4 mt-3 h-px bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0),rgb(var(--accent-divider-rgb)/0.9),rgb(var(--accent-divider-rgb)/0))]" />
          <div className="space-y-3 px-4 pb-4 pt-3">
            <p className={cn(appTokens.detailBodyText, "text-[rgb(var(--text)/0.95)] [text-wrap:pretty]")}>{introCopy}</p>
          </div>
        </div>
    </AppPanel>
  );

  return (
    <div className="space-y-3">
      {heroPanel}
      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1 text-center">
          <EyebrowText as="p" className="text-[rgb(var(--accent-divider-rgb)/0.9)]">Stretch library</EyebrowText>
        </div>

        <div className="space-y-2.5">
          <div className="space-y-2.5 rounded-[calc(var(--radius-lg)-0.35rem)] border border-[rgb(var(--border-strong)/0.08)] bg-[rgb(var(--surface-2)/0.72)] px-2.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <SearchField
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stretches"
                className="min-w-0 flex-1"
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-0.5">
              <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                {filteredStretches.length} of {STRETCH_LIBRARY_SUMMARIES.length} shown
                <span className="ml-2 text-[rgb(var(--text-secondary)/0.68)]">{activeFilterLabel}</span>
              </p>
              {hasActiveRefinements ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSelectedFilter("all");
                  }}
                  className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-secondary)/0.76)] transition-colors hover:text-[rgb(var(--accent-divider-rgb)/0.94)]"
                >
                  Clear
                </button>
              ) : null}
            </div>

                <div className="h-px bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0),rgb(var(--accent-divider-rgb)/0.5),rgb(var(--accent-divider-rgb)/0))]" />

            <div className="-mx-0.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-1.5 px-0.5">
                {STRETCH_LIBRARY_FILTERS.map((filter) => {
                  const isActive = filter.id === selectedFilter;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedFilter(filter.id)}
                      aria-pressed={isActive}
                        className={cn(
                          "inline-flex min-h-8 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                        isActive
                          ? "border-[rgb(var(--selection-rgb)/0.26)] bg-[rgb(var(--selection-rgb)/0.14)] text-[rgb(var(--selection-rgb)/0.98)]"
                          : "border-[rgb(var(--border-strong)/0.08)] bg-[rgb(var(--surface-3)/0.5)] text-[rgb(var(--text-secondary)/0.82)] hover:text-[rgb(var(--text)/0.9)]",
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <PickerListViewport
            className="[--picker-mobile-tray-max-h:21rem] bg-[rgb(var(--surface-2-soft)/0.2)] p-1.5"
            viewportClassName={cn(listShellClasses.viewport, "md:max-h-[22rem]")}
            viewportProps={{ onScroll: handleViewportScroll }}
            showFade
            mobileTray
            constrainOnDesktop
          >
            {filteredStretches.length > 0 ? (
              <ul className={cn(listShellClasses.list, "space-y-2")}>
                {visibleStretchCards.map((stretch) => {
                  const detail = detailById[stretch.id] ?? null;

                  return (
                    <li
                      key={stretch.id}
                      className="[contain-intrinsic-size:272px] [content-visibility:auto]"
                    >
                      <ExerciseCard
                        title={stretch.name}
                        titleMeta={<SignatureMetaTag>{stretch.durationGuidance}</SignatureMetaTag>}
                        variant="compact"
                        density="compact"
                        state="default"
                        className="border-[rgb(var(--border-strong)/0.08)] shadow-none"
                        contentClassName="pl-0.5"
                        titleClassName="max-md:text-[0.86rem] max-md:leading-[1.15] [text-wrap:pretty]"
                        titleContainerClassName="max-md:space-y-0.5"
                        subtitle={<StretchMetaLine items={[stretch.bodyPosition, ...stretch.targetAreas.slice(0, 2)]} />}
                        subtitleTone="plain"
                        rightIcon={null}
                        trailingClassName="min-w-0"
                      >
                        <div className="space-y-2 pt-1.5">
              <div className="h-px bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0),rgb(var(--accent-divider-rgb)/0.92),rgb(var(--accent-divider-rgb)/0))]" />
                          <p className="text-[12px] leading-[1.4] text-[rgb(var(--text-secondary)/0.92)] [text-wrap:pretty]">
                            {detail?.howTo ?? "Loading stretch guide..."}
                          </p>
                          <p className={cn(appTokens.detailBodyMutedText, "text-[12px] leading-[1.35] text-[rgb(var(--text-secondary)/0.88)] [text-wrap:pretty]")}>
                            <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span>{stretch.equipment}</span>
                              <SignatureMiniPipe />
                              <span>Use for</span>
                              <SignatureInlineList items={stretch.bestFor} separator="pipe" />
                            </span>
                          </p>
                          <p className={cn(appTokens.detailBodyMutedText, "text-[12px] leading-[1.35] text-[rgb(var(--text-secondary)/0.9)] [text-wrap:pretty]")}>
                            {detail?.coachingCue ? `Coaching cue: ${detail.coachingCue}` : "Coaching cue loading..."}
                          </p>
                        </div>
                      </ExerciseCard>
                    </li>
                  );
                })}
                {canLoadMore ? (
                  <li className="px-1 pt-1">
                    <button
                      type="button"
                      onClick={revealMoreStretches}
                      className="flex min-h-10 w-full items-center justify-center rounded-[1rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-3)/0.54)] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.96)] transition-colors hover:bg-[rgb(var(--accent-divider-rgb)/0.12)]"
                    >
                      Load {Math.min(VISIBLE_STRETCH_INCREMENT, filteredStretches.length - visibleCount)} more stretches
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : (
              <div className="rounded-[calc(var(--radius-lg)-0.3rem)] border border-dashed border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.5)] px-4 py-5 text-center">
                <p className="text-[12px] font-medium text-[rgb(var(--text-secondary)/0.92)]">No stretches match that search yet.</p>
                <p className="mt-1 text-[11px] text-[rgb(var(--text-secondary)/0.74)]">Try a different body area or clear the search.</p>
              </div>
            )}
          </PickerListViewport>
        </div>
      </AppPanel>
    </div>
  );
}
