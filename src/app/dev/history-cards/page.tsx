import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { HistoryCardsGallery } from "@/app/dev/history-cards/HistoryCardsGallery";
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
 * Dev-only gallery of the History cards (docs/design-system/CARD-SYSTEM.md section 7.3): session, exercise and
 * detail-exercise cards, the summary disclosure cards and the calendar pager, on static preview data with a fixed
 * clock. No Supabase client, no session. Availability is the shared dev-route guard (middleware answers 404 for
 * every dev path on production hosts before this page runs; the first statement repeats it).
 */
export default function DevHistoryCardsPage() {
  assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <HistoryCardsGallery />
    </ContentRail>
  );
}
