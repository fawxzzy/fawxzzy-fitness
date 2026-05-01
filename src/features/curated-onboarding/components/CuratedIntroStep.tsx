import { appTokens } from "@/components/ui/app/tokens";
import { CURATED_INTRO_CARDS } from "../constants.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function CuratedIntroStep() {
  return (
    <div className={appTokens.curatedOuterStack}>
      <CuratedInfoCard tone="accent">
        <p className={appTokens.curatedCardTitle}>A quick setup before the app starts programming around you.</p>
        <p className={appTokens.curatedCardBodyStrong}>
          You tell us your setup, we shape the future plan around it, and you still stay in control once generation exists.
        </p>
      </CuratedInfoCard>

      {CURATED_INTRO_CARDS.map((card) => (
        <CuratedInfoCard key={card.title}>
          <p className={appTokens.curatedCardTitle}>{card.title}</p>
          <p className={appTokens.curatedCardBody}>{card.body}</p>
        </CuratedInfoCard>
      ))}
    </div>
  );
}
