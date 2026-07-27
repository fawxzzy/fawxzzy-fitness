import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CuratedOnboardingShell } from "@/features/curated-onboarding/components/CuratedOnboardingShell";

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

export default function DevCuratedOnboardingPage() {
  const isReviewPreviewEnabled = process.env.HISTORY_QA_PREVIEW_ENABLED === "1";
  if (process.env.NODE_ENV === "production" && !isReviewPreviewEnabled) {
    notFound();
  }

  return (
    <CuratedOnboardingShell
      userId="mobile-regression-curated-onboarding"
      userEmail="curated.qa@example.invalid"
      userName="Curated QA"
      requestedDraftId={null}
      previewOnly
    />
  );
}
