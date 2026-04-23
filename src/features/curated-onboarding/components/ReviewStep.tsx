import { appTokens } from "@/components/ui/app/tokens";
import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function ReviewStep({ data }: { data: CuratedOnboardingData }) {
  const sections = getCuratedReviewSections(data);

  return (
    <div className={appTokens.curatedCompactStack}>
      <CuratedInfoCard tone="accent">
        <p className={appTokens.curatedCardTitle}>This intake becomes the future generator handoff.</p>
        <p className={appTokens.curatedCardBodyStrong}>
          Save it when everything feels accurate. The app will keep the intake and reuse it when the curated engine is ready.
        </p>
      </CuratedInfoCard>

      {sections.map((section) => (
        <CuratedInfoCard key={section.title} compact>
          <p className={appTokens.curatedSectionLabel}>{section.title}</p>
          <p className={appTokens.curatedCardBodyStrong}>{section.value}</p>
        </CuratedInfoCard>
      ))}
    </div>
  );
}
