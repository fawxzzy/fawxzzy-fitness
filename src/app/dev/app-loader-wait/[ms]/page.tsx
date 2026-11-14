import Link from "next/link";
import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const MAX_WAIT_MS = 8000;

/** Dev-only fixture: waits `[ms]` on the server (capped) so the route loader has something to wait for. */
export default async function DevAppLoaderWaitPage({ params }: { params: { ms: string } }) {
  assertDevPageAvailable();

  const requested = Number.parseInt(params.ms, 10);
  const waitMs = Number.isFinite(requested) ? Math.min(Math.max(requested, 0), MAX_WAIT_MS) : 0;
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  return (
    <ContentRail className="pb-24 pt-6">
      <h1 data-testid="wait-page" className="text-lg font-semibold">
        Loaded after {waitMs} ms
      </h1>
      <Link href="/dev/app-loader" className="mt-4 block text-sm underline">
        Back to the fixture
      </Link>
    </ContentRail>
  );
}
