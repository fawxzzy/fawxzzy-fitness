import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { ContentRail } from "@/components/layout/ContentRail";
import { SessionCardsGallery } from "@/app/dev/session-cards/SessionCardsGallery";

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
 * Dev-only gallery of the in-session cards (docs/design-system/CARD-SYSTEM.md section 7.3): every state of the session
 * exercise row, the hidden row, the quick-log strip, the feedback prompt, the finished card and the offline rows.
 * Static fixture data only (no Supabase client, no session). Availability is the shared dev-route guard: middleware
 * answers 404 for `/dev/*` on production hosts before this page runs; the first statement below repeats it.
 */
export default function DevSessionCardsPage() {
  assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <SessionCardsGallery />
    </ContentRail>
  );
}
