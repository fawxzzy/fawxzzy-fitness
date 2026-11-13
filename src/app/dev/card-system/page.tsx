import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { ContentRail } from "@/components/layout/ContentRail";
import { CardSystemGallery } from "@/app/dev/card-system/CardSystemGallery";

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
 * Dev-only gallery of the card system (docs/design-system/CARD-SYSTEM.md): every card kind in every state.
 * Static fixture data only (no Supabase client, no session). Availability is the shared dev-route guard:
 * middleware answers 404 for `/dev/*` on production hosts before this page runs; the first statement below
 * repeats it (a layout alone cannot stop its page). See `src/lib/dev-route-guard.ts`.
 */
export default function DevCardSystemPage() {
  assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <CardSystemGallery />
    </ContentRail>
  );
}
