import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { SettingsCardsFixture } from "@/app/dev/settings-cards/SettingsCardsFixture";

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
 * Dev-only fixture of the Settings screen on the card system (docs/design-system/CARD-SYSTEM.md, section 7.3).
 * `?section=account|achievements|pro|data|theme|discord` opens that section; no parameter shows the section list;
 * `&plan=pro` shows the subscribed Pro state. Static fixture data only: no Supabase client, no session, and the
 * export preview request is answered locally. Availability is the shared dev-route guard: middleware answers 404
 * for `/dev/*` on production hosts before this page runs; the first statement below repeats it (a layout alone
 * cannot stop its page). See `src/lib/dev-route-guard.ts`.
 */
export default function DevSettingsCardsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  assertDevPageAvailable();

  const section = Array.isArray(searchParams?.section) ? searchParams?.section[0] : searchParams?.section;
  const plan = Array.isArray(searchParams?.plan) ? searchParams?.plan[0] : searchParams?.plan;

  return <SettingsCardsFixture section={section ?? null} plan={plan === "pro" ? "pro" : "free"} />;
}
