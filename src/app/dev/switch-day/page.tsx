import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { SwitchDayGallery } from "@/app/dev/switch-day/SwitchDayGallery";
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
 * Dev-only gallery of Switch Day (Today, day picker open): every routine shape in one scroll. Static fixtures only
 * (no Supabase client, no session). Availability is the shared dev-route guard: middleware answers 404 for `/dev/*`
 * on production hosts before this page runs; the first statement below repeats it (a layout alone cannot stop its
 * page). See `src/lib/dev-route-guard.ts`.
 */
export default async function DevSwitchDayPage() {
  await assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <SwitchDayGallery />
    </ContentRail>
  );
}
