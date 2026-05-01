import { appTokens } from "@/components/ui/app/tokens";
import type { CuratedGenerationStatus, CuratedOnboardingData } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

function getStatusCopy(status: CuratedGenerationStatus) {
  if (status === "queued") {
    return {
      title: "Saving the handoff",
      body: "The intake is locked and the placeholder engine request is being exercised now.",
      tone: "warning" as const,
    };
  }

  if (status === "ready") {
    return {
      title: "Plan placeholder ready",
      body: "The contract returned a ready placeholder, but real plan preview work is still out of scope.",
      tone: "accent" as const,
    };
  }

  if (status === "failed") {
    return {
      title: "The placeholder handoff failed",
      body: "Your intake is still saved. Real generation is not implemented yet, so this does not block you from coming back later.",
      tone: "danger" as const,
    };
  }

  if (status === "not-implemented") {
    return {
      title: "Generation is not implemented yet",
      body: "Your intake is saved, the contract is wired, and you can return later when the real curated engine exists.",
      tone: "accent" as const,
    };
  }

  return {
    title: "Intake saved locally",
    body: "The intake is complete. This placeholder is holding the spot where real generation will take over later.",
    tone: "default" as const,
  };
}

function formatGenerationStatus(status: CuratedGenerationStatus) {
  if (status === "not-implemented") {
    return "Not implemented";
  }

  if (status === "queued") {
    return "Queued";
  }

  if (status === "ready") {
    return "Ready";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Idle";
}

export function GenerationHandoffStep({
  data,
  generationStatus,
}: {
  data: CuratedOnboardingData;
  generationStatus: CuratedGenerationStatus;
}) {
  const copy = getStatusCopy(generationStatus);

  return (
    <div className={appTokens.curatedOuterStack}>
      <CuratedInfoCard tone={copy.tone}>
        <p className={appTokens.curatedCardTitle}>{copy.title}</p>
        <p className={appTokens.curatedCardBodyStrong}>{copy.body}</p>
      </CuratedInfoCard>

      <div className={appTokens.curatedTwoColumnGrid}>
        <CuratedInfoCard compact>
          <p className={appTokens.curatedSectionLabel}>Intake status</p>
          <p className={appTokens.curatedCardBodyStrong}>Completed</p>
        </CuratedInfoCard>
        <CuratedInfoCard compact>
          <p className={appTokens.curatedSectionLabel}>Generation status</p>
          <p className={appTokens.curatedCardBodyStrong}>{formatGenerationStatus(generationStatus)}</p>
        </CuratedInfoCard>
      </div>

      <CuratedInfoCard>
        <p className={appTokens.curatedSectionLabel}>Saved intake snapshot</p>
        <pre className={appTokens.curatedSnapshot}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </CuratedInfoCard>
    </div>
  );
}
