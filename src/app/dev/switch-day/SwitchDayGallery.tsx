"use client";

import Link from "next/link";
import { useState } from "react";
import { TodaySwitchDayList } from "@/app/today/TodaySwitchDayCard";
import { SWITCH_DAY_VARIANTS, type SwitchDayVariant } from "@/app/dev/switch-day/switchDayFixtures";

function VariantSection({ variant }: { variant: SwitchDayVariant }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(variant.selectedDayIndex);

  return (
    <section aria-labelledby={`switch-day-${variant.id}`} data-switch-day-variant={variant.id} className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`switch-day-${variant.id}`} className="m-0 text-sm font-semibold text-[rgb(var(--text-primary))]">{variant.label}</h2>
        <Link
          href={`/dev/mobile-regression/switch-day?variant=${variant.id}`}
          className="shrink-0 text-xs font-medium text-[rgb(var(--accent))] underline underline-offset-2"
        >
          Full screen
        </Link>
      </div>
      <p className="m-0 text-xs text-[rgb(var(--text-muted))]">{variant.note}</p>
      <TodaySwitchDayList
        days={variant.days}
        startDate={variant.startDate}
        currentDayIndex={variant.currentDayIndex}
        selectedDayIndex={selectedDayIndex}
        completedDayIndexes={variant.completedDayIndexes}
        inSessionDayIndex={variant.inSessionDayIndex}
        onSelectDay={setSelectedDayIndex}
      />
    </section>
  );
}

/**
 * Every Switch Day variation, rendered with the live list component (TodaySwitchDayList, the same one the Today
 * picker renders). "Full screen" opens the variant inside the real Today screen (header, dock, backdrop).
 */
export function SwitchDayGallery() {
  return (
    <div className="grid gap-8">
      <header className="grid gap-1">
        <h1 className="m-0 text-lg font-semibold text-[rgb(var(--text-primary))]">Switch Day variations</h1>
        <p className="m-0 text-sm text-[rgb(var(--text-secondary))]">
          {SWITCH_DAY_VARIANTS.length} fixtures. Tap a card to move the selection.
        </p>
      </header>
      {SWITCH_DAY_VARIANTS.map((variant) => <VariantSection key={variant.id} variant={variant} />)}
    </div>
  );
}
