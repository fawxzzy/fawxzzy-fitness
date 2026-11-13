import type { Metadata } from "next";
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
 * middleware answers 404 for `/dev/*` on production deployments before this page runs, and
 * `src/app/dev/layout.tsx` repeats it. See `src/lib/dev-route-guard.ts`.
 */
export default function DevCardSystemPage() {
  return (
    <ContentRail className="pb-24 pt-6">
      <CardSystemGallery />
    </ContentRail>
  );
}
