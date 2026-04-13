import { redirect } from "next/navigation";
import { CuratedOnboardingShell } from "@/features/curated-onboarding/components/CuratedOnboardingShell";
import { requireUser } from "@/lib/auth";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function CuratedOnboardingPage({
  searchParams,
}: {
  searchParams?: { draft?: string };
}) {
  if (!isCuratedOnboardingEnabled()) {
    redirect("/today");
  }

  const user = await requireUser();

  return <CuratedOnboardingShell userId={user.id} requestedDraftId={searchParams?.draft ?? null} />;
}
