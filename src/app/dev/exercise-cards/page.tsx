import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { ContentRail } from "@/components/layout/ContentRail";
import { ExerciseCardsGallery } from "@/app/dev/exercise-cards/ExerciseCardsGallery";

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
 * Dev-only gallery of the exercise card redesign (docs/design-system/CARD-SYSTEM.md section 3.3): progression fill
 * levels, Promote at 100% (local stub), timed / long-name / no-image cards, completed rows and the Promote celebration.
 * Static fixture data only (no Supabase client, no session, no server action). Availability is the shared dev-route
 * guard: middleware answers 404 for `/dev/*` on production hosts before this page runs; the first statement repeats it.
 */
export default async function DevExerciseCardsPage() {
  await assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <ExerciseCardsGallery />
    </ContentRail>
  );
}
