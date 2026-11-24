import type { Metadata } from "next";
import { AccountScreen } from "@/components/account/AccountScreen";
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
 * Dev-only fixture of the /account screen (no session needed). `?who=long` uses very long values, `?who=empty` has no
 * username. Static data only. Availability is the shared dev-route guard (see `src/lib/dev-route-guard.ts`).
 */
export default async function DevAccountScreenPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  await assertDevPageAvailable();
  const searchParams = await props.searchParams;
  const who = Array.isArray(searchParams?.who) ? searchParams?.who[0] : searchParams?.who;

  if (who === "long") {
    return (
      <AccountScreen
        email="a-very-long-account-name.with.many.parts+fitness@a-long-email-provider.example.com"
        username="a-very-long-username-that-keeps-going-and-going-on"
        returnHref="/settings"
      />
    );
  }

  return (
    <AccountScreen
      email={who === "empty" ? "" : "dev-fixture@example.com"}
      username={who === "empty" ? "" : "dev-fixture"}
      returnHref="/settings"
    />
  );
}
