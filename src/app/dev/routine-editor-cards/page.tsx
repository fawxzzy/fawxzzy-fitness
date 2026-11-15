import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { RoutineEditorCardsFixture } from "@/app/dev/routine-editor-cards/RoutineEditorCardsFixture";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/**
 * Dev-only fixture of the routine editor and creation screens on the card system
 * (docs/design-system/CARD-SYSTEM.md, section 7.6). `?screen=editor` (default) shows the routine setup sections,
 * `new-day` the add-day screen, `new-routine` the create-routine chooser (add `&duplicate=1` to open the source list).
 * Static fixture data only: no Supabase client, no session. Availability is the shared dev-route guard
 * (see `src/lib/dev-route-guard.ts`); the first statement repeats it because a layout alone cannot stop its page.
 */
export default function DevRoutineEditorCardsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  assertDevPageAvailable();

  const pick = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const screen = pick("screen");

  return (
    <RoutineEditorCardsFixture
      screen={screen === "new-day" || screen === "new-routine" ? screen : "editor"}
      expanded={pick("open") !== "0"}
      duplicate={pick("duplicate") === "1"}
    />
  );
}
