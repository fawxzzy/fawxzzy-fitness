import type { Metadata } from "next";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { RoutinesLab, type RoutinesLabState } from "@/app/dev/routines-lab/RoutinesLab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const STATES: RoutinesLabState[] = [
  "list",
  "list-empty",
  "list-create",
  "list-create-duplicate",
  "list-archived",
  "list-archived-open",
  "list-archived-limit",
  "list-empty-archived",
  "detail",
  "detail-add-day",
];

/**
 * Dev-only lab for the Routines screens (lane C). `?state=` picks the screen. Actions are in-page fakes that can
 * fail on purpose (`?fail=1`: every action returns an error) or hang (`?hang=1`), so the notice slots, the confirm
 * loading state and the duplicate-name error can be captured without a session. No Supabase client, no server action.
 * The first statement repeats the shared dev-route guard because a layout alone cannot stop its page.
 */
export default async function DevRoutinesLabPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertDevPageAvailable();
  const searchParams = await props.searchParams;
  const pick = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const requested = pick("state") as RoutinesLabState | undefined;
  const state = requested && STATES.includes(requested) ? requested : "list";

  return <RoutinesLab state={state} fail={pick("fail") === "1"} hang={pick("hang") === "1"} />;
}
