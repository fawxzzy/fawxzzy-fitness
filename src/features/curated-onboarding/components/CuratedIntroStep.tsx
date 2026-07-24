import Link from "next/link";
import { appTokens } from "@/components/ui/app/tokens";
import { CURATED_INTRO_CARDS } from "../constants.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function CuratedIntroStep() {
  return (
    <div className={appTokens.curatedOuterStack}>
      <CuratedInfoCard tone="accent">
        <p className={appTokens.curatedCardTitle}>A quick setup before the app builds your starting routine.</p>
        <p className={appTokens.curatedCardBodyStrong}>
          You tell us your setup, we build a bounded plan around it, and you stay in control through the normal routine editor.
        </p>
      </CuratedInfoCard>

      {CURATED_INTRO_CARDS.map((card) => (
        <CuratedInfoCard key={card.title}>
          <p className={appTokens.curatedCardTitle}>{card.title}</p>
          <p className={appTokens.curatedCardBody}>{card.body}</p>
        </CuratedInfoCard>
      ))}

      <Link href="/routines/new" className={appTokens.curatedInlineLink}>
        Build a routine manually instead
      </Link>
    </div>
  );
}
