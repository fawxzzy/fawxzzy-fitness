"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SearchField } from "@/components/ui/SearchField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SkeletonCard, SkeletonThumb } from "@/components/ui/Skeleton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import {
  resolveUiSystemFixture,
  type UiSystemFixtureId,
  uiSystemFixtureIds,
} from "@/lib/dev/uiSystemFixtures";

export function UiSystemShowcase({ fixtureId }: { fixtureId: UiSystemFixtureId }) {
  const fixture = resolveUiSystemFixture(fixtureId);
  const [segmentValue, setSegmentValue] = useState<"today" | "history" | "library">("today");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cardRows = useMemo(
    () =>
      fixture.exercises.map((exercise) => (
        <StandardExerciseRow
          key={exercise.id}
          exercise={{
            name: exercise.name,
            image_icon_path: exercise.image_icon_path,
          }}
          summary={exercise.summary}
          badgeText={exercise.badgeText}
          state={exercise.state}
          density={exercise.density}
          showLeadingVisual={exercise.showLeadingVisual ?? true}
        />
      )),
    [fixture.exercises],
  );

  return (
    <div className="space-y-4 pb-32 pt-4">
      <SurfaceCard dense className="gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">
          Dev-only route · /dev/ui-system
        </p>
        <SubtitleText className="block">
          Deterministic system showcase for visual QA. Switch fixtures with the query string to inspect long text, broken media,
          zero results, and active states without relying on live data.
        </SubtitleText>
        <div className="flex flex-wrap gap-2">
          {uiSystemFixtureIds.map((id) => (
            <Link key={id} href={`/dev/ui-system?fixture=${id}`} className="focus-visible:outline-none">
              <Chip tone={fixtureId === id ? "today" : "default"}>{id}</Chip>
            </Link>
          ))}
        </div>
      </SurfaceCard>

      <SharedScreenHeader
        recipe="todayOverview"
        title={fixture.header.title}
        subtitle={fixture.header.subtitle}
        meta={fixture.header.meta}
        action={fixture.header.status ? <Chip tone="today">{fixture.header.status}</Chip> : undefined}
      />

      <SurfaceCard>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Fixture</p>
          <TitleText as="h2" className="text-[1.625rem]">
            {fixture.label}
          </TitleText>
          <SubtitleText className="block">{fixture.description}</SubtitleText>
        </div>
        <p className="text-[15px] leading-6 text-[rgb(var(--text-secondary)/0.98)]">{fixture.notes}</p>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Buttons</p>
            <TitleText as="h2" className="text-[1.3125rem]">Four variants, three sizes</TitleText>
          </div>
          <IconButton aria-label="More actions">+</IconButton>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <AppButton variant="primary" size="lg">Primary</AppButton>
            <AppButton variant="secondary" size="lg">Secondary</AppButton>
            <AppButton variant="tertiary" size="md">Tertiary</AppButton>
            <AppButton variant="destructive" size="md">Delete</AppButton>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <AppButton variant="primary" size="sm">Save</AppButton>
            <AppButton variant="secondary" size="sm" loading>Sync</AppButton>
            <AppButton variant="tertiary" size="sm" disabled>Disabled</AppButton>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Cards</p>
          <TitleText as="h2" className="text-[1.3125rem]">Exercise card densities</TitleText>
        </div>
        <div className="space-y-3">
          {cardRows.length ? cardRows : <EmptyState title={fixture.emptyState.title} body={fixture.emptyState.body} />}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Controls</p>
          <TitleText as="h2" className="text-[1.3125rem]">Inputs, chips, and segmented state</TitleText>
        </div>
        <SearchField placeholder={fixture.searchPlaceholder} />
        <SegmentedControl
          value={segmentValue}
          onChange={(value) => setSegmentValue(value as "today" | "history" | "library")}
          options={[
            { value: "today", label: "Today" },
            { value: "history", label: "History" },
            { value: "library", label: "Library" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {fixture.chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
          <Chip tone="success">stable</Chip>
          <Chip tone="warning">warning</Chip>
          <Chip tone="destructive">destructive</Chip>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Loading + Empty</p>
          <TitleText as="h2" className="text-[1.3125rem]">Preserved footprint</TitleText>
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-[var(--radius-lg)] border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.88)] p-4">
            <SkeletonThumb />
            <EmptyState title={fixture.emptyState.title} body={fixture.emptyState.body} className="border-0 bg-transparent p-0 shadow-none" />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">Overlays</p>
          <TitleText as="h2" className="text-[1.3125rem]">Sheet and destructive confirmation</TitleText>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AppButton variant="secondary" size="md" onClick={() => setSheetOpen(true)}>Open Sheet</AppButton>
          <AppButton variant="destructive" size="md" onClick={() => setConfirmOpen(true)}>Open Confirm</AppButton>
        </div>
      </SurfaceCard>

      <BottomSheet
        open={sheetOpen}
        title="Exercise info"
        description="Canonical sheet shell with the same surface language as cards and buttons."
        onClose={() => setSheetOpen(false)}
      >
        <div className="space-y-3 pb-4">
          {cardRows.length ? cardRows.slice(0, 2) : <EmptyState title={fixture.emptyState.title} body={fixture.emptyState.body} />}
        </div>
      </BottomSheet>

      <ConfirmDestructiveModal
        open={confirmOpen}
        title="Delete routine day?"
        confirmLabel="Delete"
        consequenceText="This removes the day and all planned exercises from the fixture showcase."
        bullets={[
          "Destructive actions should stay neutral and legible.",
          "The confirm button keeps its width while loading.",
        ]}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
      />

      <BottomActionBar variant="sticky">
        <BottomDockButton intent="info" type="button" onClick={() => setSheetOpen(true)}>
          Preview
        </BottomDockButton>
        <BottomDockButton intent="positive" type="button" loading={fixtureId === "in-progress"}>
          Capture
        </BottomDockButton>
      </BottomActionBar>
    </div>
  );
}
