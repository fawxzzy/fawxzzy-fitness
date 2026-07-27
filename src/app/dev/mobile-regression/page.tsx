import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

export default async function DevMobileRegressionPage({
  searchParams,
}: {
  searchParams?: {
    scenario?: string;
    screen?: string;
    fixture?: string;
  };
}) {
  const isReviewPreviewEnabled = process.env.HISTORY_QA_PREVIEW_ENABLED === "1";
  if (process.env.NODE_ENV === "production" && !isReviewPreviewEnabled) {
    notFound();
  }

  const { default: DevMobileRegressionRoute } = await import("@/app/dev/mobile-regression/DevMobileRegressionRoute");
  return <DevMobileRegressionRoute allowProductionPreview={isReviewPreviewEnabled} searchParams={searchParams} />;
}
