import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData, CuratedStepId } from "../types.ts";

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
      {sections.map((section, index) => (
        <details key={section.stepId} className="group overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.34)]" open={index === 0}>
          <summary
            className={cn(
              "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 border-l-[3px] px-3.5 py-3 [-webkit-tap-highlight-color:transparent] marker:hidden",
              section.complete
                ? "border-[rgb(var(--accent))]"
                : "border-[rgb(var(--warning-rgb))]",
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-primary))]">{section.title}</span>
            <span className="flex items-center gap-2">
              <Chip tone={section.complete ? "success" : "attention"} data-section-status={section.complete ? "completed" : "incomplete"}>
                {section.complete ? "Completed" : "Needs answers"}
              </Chip>
              <span aria-hidden="true" className="text-sm text-[rgb(var(--text-muted))] transition-transform group-open:rotate-90">&gt;</span>
            </span>
          </summary>

          <div className="border-t border-[rgb(var(--border-strong)/0.16)]">
            <div className="flex justify-end px-3.5 py-2">
              <AppButton
                variant="quiet"
                size="sm"
                fullWidth={false}
                aria-label={`Edit ${section.title}`}
                onClick={() => onEdit(section.stepId)}
              >
                Edit
              </AppButton>
            </div>
            <dl className="divide-y divide-[rgb(var(--border-strong)/0.12)]">
              {section.answers.map((answer) => (
                <div
                  key={answer.id}
                  data-answer-status={answer.incomplete ? "incomplete" : "complete"}
                  className="space-y-1 px-3.5 py-3"
                >
                  <dt className="text-[11px] font-semibold uppercase leading-4 tracking-[0.11em] text-[rgb(var(--accent)/0.9)]">
                    {answer.label}
                  </dt>
                  <dd
                    className={cn(
                      "whitespace-pre-wrap text-xs font-medium leading-5",
                      answer.incomplete
                        ? "italic text-[rgb(var(--text-muted))]"
                        : "text-[rgb(var(--text-secondary)/0.96)]",
                    )}
                  >
                    {answer.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}
