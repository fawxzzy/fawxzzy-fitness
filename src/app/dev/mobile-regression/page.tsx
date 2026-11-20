import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppBackdropOverride } from "@/components/layout/AppBackdrop";
import { resolveDevRegressionBackdrop } from "@/lib/ambient/app-backdrop";
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

export default async function DevMobileRegressionPage(
  props: {
    searchParams?: Promise<{
      scenario?: string;
      screen?: string;
      fixture?: string;
      backdrop?: string;
    }>;
  }
) {
  await assertDevPageAvailable();
  const searchParams = await props.searchParams;

  const isReviewPreviewEnabled = process.env.HISTORY_QA_PREVIEW_ENABLED === "1";
  if (process.env.NODE_ENV === "production" && !isReviewPreviewEnabled) {
    notFound();
  }

  const { default: DevMobileRegressionRoute } = await import("@/app/dev/mobile-regression/DevMobileRegressionRoute");
  const route = <DevMobileRegressionRoute allowProductionPreview={isReviewPreviewEnabled} searchParams={searchParams} />;
  // Today scenarios mirror production /today, which draws the static backdrop; `?backdrop=a|b|c` compares the three
  // looks (/dev/today-backgrounds) and `?backdrop=ambient` shows the old animated scene.
  const backdrop = resolveDevRegressionBackdrop(searchParams ?? {});
  return backdrop ? <AppBackdropOverride variant={backdrop}>{route}</AppBackdropOverride> : route;
}
