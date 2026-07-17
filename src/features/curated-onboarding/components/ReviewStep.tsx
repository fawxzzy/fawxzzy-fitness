import { appTokens } from "@/components/ui/app/tokens";
import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData, CuratedStepId } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function ReviewStep({
  data,
  onEdit,
}: {
  data: CuratedOnboardingData;
  onEdit: (stepId: CuratedStepId) => void;
}) {
  const sections = getCuratedReviewSections(data);

  return (
    <div className="space-y-3">
      <CuratedInfoCard tone="accent" compact>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Complete intake</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.92)]">
            {sections.length} sections
          </p>
        </div>
      </CuratedInfoCard>

      {sections.map((section, index) => (
        <details key={section.stepId} className="group overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.34)]" open={index === 0}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 border-l-[3px] border-[rgb(var(--accent))] px-3.5 py-3 [-webkit-tap-highlight-color:transparent] marker:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-primary))]">{section.title}</span>
            <span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-[rgb(var(--accent)/0.92)]">
              {section.answers.length} answers
              <span aria-hidden="true" className="text-sm transition-transform group-open:rotate-90">&gt;</span>
            </span>
          </summary>

          <div className="border-t border-[rgb(var(--border-strong)/0.16)]">
            <div className="flex justify-end px-3.5 py-2">
              <button
                type="button"
                onClick={() => onEdit(section.stepId)}
                className={`${appTokens.authInlineButton} text-[10px] font-semibold uppercase tracking-[0.12em]`}
              >
                Edit
              </button>
            </div>
            <dl className="divide-y divide-[rgb(var(--border-strong)/0.12)]">
              {section.answers.map((answer) => (
                <div key={answer.id} className="space-y-1 px-3.5 py-3">
                  <dt className="text-[9px] font-semibold uppercase leading-4 tracking-[0.11em] text-[rgb(var(--accent)/0.9)]">{answer.label}</dt>
                  <dd className="whitespace-pre-wrap text-xs font-medium leading-5 text-[rgb(var(--text-secondary)/0.96)]">{answer.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}
