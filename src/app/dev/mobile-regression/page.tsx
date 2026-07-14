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
  const isVercelPreview = process.env.VERCEL_ENV === "preview";
  if (process.env.NODE_ENV === "production" && !isVercelPreview) {
    notFound();
  }

  const { default: DevMobileRegressionRoute } = await import("@/app/dev/mobile-regression/DevMobileRegressionRoute");
  return <DevMobileRegressionRoute searchParams={searchParams} />;
}
