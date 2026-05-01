import { appTokens } from "@/components/ui/app/tokens";
import { Pill } from "@/components/ui/Pill";

export function CuratedOnboardingProgress({
  currentStep,
  totalSteps,
  progress,
}: {
  currentStep: number;
  totalSteps: number;
  progress: number;
}) {
  return (
    <div className={appTokens.curatedProgressCard}>
      <div className={appTokens.curatedSplitRow}>
        <div className={appTokens.curatedInlineStack}>
          <Pill tone="success">Step {currentStep} / {totalSteps}</Pill>
          <p className={appTokens.curatedSectionLabel}>Training intake</p>
        </div>
        <p className={appTokens.curatedSectionLabel}>{progress}% complete</p>
      </div>

      <div className={appTokens.curatedProgressTrack}>
        <div
          className={appTokens.curatedProgressBar}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
