import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { RoutineDayKindReviewPanel } from "@/components/routines/RoutineDayKindReviewPanel";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenBackLink } from "@/components/ui/app/ScreenBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";

export const metadata: Metadata = {
  title: "Routine day status review",
  robots: { index: false, follow: false },
};

export default function OptionalPlannedDayReviewPage() {
  return (
    <AppShell topNavMode="none" className="min-h-[100dvh]" ambientPreset="editDay">
      <main className="flex min-h-[100dvh] w-full flex-col pb-8 pt-[max(var(--app-safe-top),var(--vv-top,0px))]">
        <ScreenHeader
          kind="detail"
          title="Optional workout day"
          subtitle="Preview"
          back={<ScreenBackLink href="/routines" label="Back to Routines" />}
        />
        <ContentRail className="w-full space-y-3">
          <RoutineDayKindReviewPanel />
          <p className="px-1 text-[12px] leading-5 text-[rgb(var(--text-muted)/0.88)]">
            This is the same control as on the routine card. Nothing here reads or changes your routine.
          </p>
        </ContentRail>
      </main>
    </AppShell>
  );
}
