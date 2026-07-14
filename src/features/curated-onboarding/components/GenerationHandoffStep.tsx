import { appTokens } from "@/components/ui/app/tokens";
import type { CuratedGenerationStatus, CuratedOnboardingData } from "../types.ts";
import type { CuratedWorkoutPlan } from "../engine.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";
import { PrimaryButton } from "@/components/ui/AppButton";

function getStatusCopy(status: CuratedGenerationStatus) {
  if (status === "queued") {
    return {
      title: "Building your plan",
      body: "Your completed intake is being converted into an editable routine now.",
      tone: "warning" as const,
    };
  }

  if (status === "ready") {
    return {
      title: "Your plan is ready to review",
      body: "Every day uses catalog exercises and double progression. Open it as a draft to edit exercises, days, and targets before publishing.",
      tone: "accent" as const,
    };
  }

  if (status === "failed") {
    return {
      title: "Plan generation failed",
      body: "Your intake is still saved. Adjust the intake or retry generation without losing the draft.",
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
    body: "The intake is complete. Plan generation will begin when this handoff step is ready.",
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

function formatExerciseTarget(exercise: CuratedWorkoutPlan["days"][number]["exercises"][number]) {
  if (exercise.targetDurationSeconds) {
    return `${exercise.targetSets}x${Math.round(exercise.targetDurationSeconds / 60)} min`;
  }
  return `${exercise.targetSets}x${exercise.targetRepsMin}-${exercise.targetRepsMax}`;
}

export function GenerationHandoffStep({
  data,
  generationStatus,
  plan,
  isCreatingDraft,
  error,
  onCreateDraft,
}: {
  data: CuratedOnboardingData;
  generationStatus: CuratedGenerationStatus;
  plan: CuratedWorkoutPlan | null;
  isCreatingDraft: boolean;
  error: string | null;
  onCreateDraft: () => void;
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

      {plan ? (
        <div className={appTokens.curatedOuterStack}>
          {plan.rationale.map((item) => (
            <CuratedInfoCard key={item} compact>
              <p className={appTokens.curatedCardBodyStrong}>{item}</p>
            </CuratedInfoCard>
          ))}
          {plan.days.map((day) => (
            <CuratedInfoCard key={day.name}>
              <p className={appTokens.curatedCardTitle}>{day.name}</p>
              <p className={appTokens.curatedCardBodyStrong}>
                {day.exercises.map((exercise) => `${exercise.name} ${formatExerciseTarget(exercise)}`).join(" | ")}
              </p>
            </CuratedInfoCard>
          ))}
          {error ? <p className="text-sm text-[rgb(var(--danger-rgb))]">{error}</p> : null}
          <PrimaryButton type="button" disabled={isCreatingDraft} onClick={onCreateDraft}>
            {isCreatingDraft ? "Creating editable draft..." : "Create editable draft"}
          </PrimaryButton>
        </div>
      ) : null}

      <CuratedInfoCard>
        <p className={appTokens.curatedSectionLabel}>Saved intake snapshot</p>
        <pre className={appTokens.curatedSnapshot}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </CuratedInfoCard>
    </div>
  );
}
