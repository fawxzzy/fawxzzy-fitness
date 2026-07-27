import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { RoutineDayKindReviewPanel } from "@/components/routines/RoutineDayKindReviewPanel";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";

export const metadata: Metadata = {
  title: "Routine day status review",
  robots: { index: false, follow: false },
};

export default function OptionalPlannedDayReviewPage() {
  return (
    <AppShell topNavMode="none" className="min-h-[100dvh]" ambientPreset="editDay">
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-3 pb-8 pt-4 sm:px-5">
        <ContentRail className="w-full py-1">
          <ScreenScaffold recipe="editDay" className="w-full">
            <SharedScreenHeader
              recipe="editDay"
              title="Optional workout day"
              subtitle="Routine card control"
              action={<span className="text-[11px] font-semibold text-[rgb(var(--accent-strong))]">Review</span>}
            />
            <div className="mt-4 space-y-3">
              <RoutineDayKindReviewPanel />
              <p className="px-1 text-center text-[12px] leading-5 text-[rgb(var(--text-muted)/0.88)]">
                This is the exact control used on the routine card. It is data-safe here and does not read or change your routine.
              </p>
            </div>
          </ScreenScaffold>
        </ContentRail>
      </main>
    </AppShell>
  );
}
