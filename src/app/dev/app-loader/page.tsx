import Link from "next/link";
import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { AppLoaderLab } from "@/app/dev/app-loader/AppLoaderLab";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const WAITS_MS = [0, 60, 300, 1500, 4000] as const;

/**
 * Dev-only fixture for the app loader (docs/design-system/LOADER-SPEC.md): each link opens a route that waits
 * a fixed time on the server, so the loader's show delay, minimum hold and fades can be watched and measured.
 * No Supabase client and no session. Availability is the shared dev-route guard (middleware answers 404 on
 * production hosts; the first statement below repeats it).
 */
export default function DevAppLoaderPage() {
  assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <h1 className="text-lg font-semibold">App loader fixture</h1>
      <p className="mt-1 text-sm text-[rgb(var(--text-secondary))]">
        Each link waits on the server before the page renders.
      </p>
      <ul className="mt-4 grid gap-3">
        {WAITS_MS.map((ms) => (
          <li key={ms}>
            <Link
              data-testid={`wait-${ms}`}
              href={`/dev/app-loader-wait/${ms}`}
              className="block rounded-xl border border-[rgb(var(--stroke-soft)/0.4)] px-4 py-3"
            >
              Wait {ms} ms
            </Link>
          </li>
        ))}
      </ul>
      <AppLoaderLab />
    </ContentRail>
  );
}
