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
  const metadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata as Record<string, unknown>
    : {};
  const userName = typeof metadata.username === "string"
    ? metadata.username.trim()
    : typeof metadata.display_name === "string"
      ? metadata.display_name.trim()
      : "";

  return (
    <CuratedOnboardingShell
      userId={user.id}
      userEmail={user.email ?? ""}
      userName={userName}
      requestedDraftId={searchParams?.draft ?? null}
    />
  );
}
