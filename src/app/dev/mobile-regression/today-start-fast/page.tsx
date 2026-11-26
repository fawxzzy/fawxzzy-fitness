import type { Metadata } from "next";
import { RegressionBodyFlag } from "@/app/dev/mobile-regression/RegressionBodyFlag";
import { DevTodayStartFastFixture, type DevTodayStartFastState } from "@/app/dev/mobile-regression/today-start-fast/DevTodayStartFastFixture";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { AppTabBarPreview } from "@/components/AppTabBar";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { ContentRail } from "@/components/layout/ContentRail";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { formatTodayHeaderSubtitle } from "@/lib/today-page-state";
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

const STATES: readonly DevTodayStartFastState[] = ["first-run", "restore", "pick-routine", "choose", "plan", "in-session", "done"];

/**
 * Wave 2 "Start fast" Today states inside the real Today screen (header slots, dock, tab bar), drawn with the live
 * components: `?state=first-run` (no routines, no workouts: three starter plans), `restore` (every routine archived:
 * plans plus "Restore a routine"), `pick-routine` (routines exist, none active: pick one of yours), `choose` (an
 * unreadable count, or workouts but no routines: the plain Routines card), `plan` (a just-picked plan, compact list
 * with "Last:" lines, Start on the dock), `in-session` (one in-progress card with Discard in its ⋯ menu, Resume on
 * the dock) and `done` (today's workout finished). Static fixtures only: no Supabase client, no session; the starter
 * pick and Discard answer locally. Availability is the shared dev-route guard (`src/lib/dev-route-guard.ts`).
 */
export default async function DevTodayStartFastPage(props: { searchParams?: Promise<{ state?: string }> }) {
  await assertDevPageAvailable();
  const searchParams = (await props.searchParams) ?? {};
  const state = STATES.find((value) => value === searchParams.state) ?? "first-run";
  const usesPicker = state === "plan" || state === "done";

  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <AppTabBarPreview pathname="/today" />
      <RegressionBodyFlag />
      <div hidden data-mobile-regression-root="true" data-mobile-regression-id={`today-start-fast-${state}`} data-mobile-regression-screen="today" />
      <ScrollScreenWithBottomActions
        floatingHeader={usesPicker ? (
          <>
            <div id="today-routine-switch-floating-header-slot" />
            <div id="today-floating-header-slot" />
          </>
        ) : (
          <ScreenHeader
            kind="tab"
            title="Today"
            subtitle={state === "in-session" ? formatTodayHeaderSubtitle("Full body A", "Full body") : "No active routine"}
          />
        )}
      >
        <ContentRail className="space-y-3">
          <DevTodayStartFastFixture state={state} />
        </ContentRail>
        {state === "in-session" ? (
          <PublishBottomActions>
            <BottomActionSingle>
              <TodayStartButton sessionId="sf-session" returnTo="/today" fullWidth className="w-full" label="Resume workout" />
            </BottomActionSingle>
          </PublishBottomActions>
        ) : null}
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
