import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegressionBodyFlag } from "@/app/dev/mobile-regression/RegressionBodyFlag";
import { findSwitchDayVariant, SWITCH_DAY_VARIANTS } from "@/app/dev/switch-day/switchDayFixtures";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { AppMenu } from "@/components/AppNav";
import { AppBackdropOverride } from "@/components/layout/AppBackdrop";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { resolveDevRegressionBackdrop } from "@/lib/ambient/app-backdrop";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * One Switch Day fixture inside the real Today screen: the live TodayDayPicker (opened with `initialPickerOpen`),
 * header slot, dock and Today backdrop, exactly as /today draws them. Lives under /dev/mobile-regression so the
 * shell draws its own chrome. `?variant=<id>` (see switchDayFixtures.ts), `&closed=1` starts with the picker closed,
 * `&noSchedule=1` shows the "No scheduled workout" state (closed picker), `&backdrop=a|b|c|ambient` as on the
 * regression route. Static fixtures only: no Supabase client, no session.
 */
export default async function DevSwitchDayFullScreenPage(
  props: {
    searchParams?: Promise<{ variant?: string; closed?: string; noSchedule?: string; backdrop?: string }>;
  },
) {
  await assertDevPageAvailable();
  const searchParams = (await props.searchParams) ?? {};
  const variant = findSwitchDayVariant(searchParams.variant ?? SWITCH_DAY_VARIANTS[0].id);
  if (!variant) {
    notFound();
  }

  const backdrop = resolveDevRegressionBackdrop({ screen: "today", backdrop: searchParams.backdrop });
  const screen = (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <RegressionBodyFlag />
      <div hidden data-mobile-regression-root="true" data-mobile-regression-id={`switch-day-${variant.id}`} data-mobile-regression-screen="today" />
      <ScrollScreenWithBottomActions
        headerMenu={<AppMenu activePathnameOverride="/today" />}
        floatingHeader={<div id="today-floating-header-slot" />}
      >
        <ContentRail className="space-y-3">
          <TodayDayPicker
            days={variant.days}
            currentDayIndex={variant.currentDayIndex}
            initialSelectedDayIndex={variant.selectedDayIndex}
            completedDayIndexes={variant.completedDayIndexes}
            inSessionDayIndex={variant.inSessionDayIndex}
            routineName={variant.routineName}
            startDate={variant.startDate}
            floatingHeaderSlotId="today-floating-header-slot"
            progressionRoutineId="routine-dev"
            initialPickerOpen={searchParams.closed !== "1" && searchParams.noSchedule !== "1"}
            noScheduledDayMessage={searchParams.noSchedule === "1" ? "No scheduled workout" : null}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );

  return backdrop ? <AppBackdropOverride variant={backdrop}>{screen}</AppBackdropOverride> : screen;
}
