import { cn } from "@/lib/cn";
import { getCuratedReviewSections } from "../selectors.ts";
import type { CuratedOnboardingData, CuratedStepId } from "../types.ts";

const EDIT_ACTION_CLASS_NAME = "relative appearance-none !border-0 !bg-transparent !px-0 !pb-1 !pt-0 !text-[rgb(var(--warning-rgb))] !shadow-none text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:rounded-full after:bg-[linear-gradient(90deg,rgb(var(--warning-rgb)/0.14),rgb(var(--warning-rgb)/0.9),rgb(var(--warning-rgb)/0.14))] after:shadow-[0_0_14px_rgb(var(--warning-rgb)/0.18)] hover:!text-[rgb(255_242_200)] focus-visible:!outline-none focus-visible:after:h-[2px]";

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
                : "border-[rgb(var(--danger-rgb))]",
            )}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--text-primary))]">{section.title}</span>
            <span
              data-section-status={section.complete ? "completed" : "incomplete"}
              className={cn(
                "flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em]",
                section.complete
                  ? "text-[rgb(var(--accent)/0.96)]"
                  : "text-[rgb(var(--danger-rgb)/0.98)]",
              )}
            >
              {section.complete ? "Completed" : "Incomplete"}
              <span aria-hidden="true" className="text-sm transition-transform group-open:rotate-90">&gt;</span>
            </span>
          </summary>

          <div className="border-t border-[rgb(var(--border-strong)/0.16)]">
            <div className="flex justify-end px-3.5 py-2">
              <button
                type="button"
                onClick={() => onEdit(section.stepId)}
                className={EDIT_ACTION_CLASS_NAME}
              >
                Edit
              </button>
            </div>
            <dl className="divide-y divide-[rgb(var(--border-strong)/0.12)]">
              {section.answers.map((answer) => (
                <div
                  key={answer.id}
                  data-answer-status={answer.incomplete ? "incomplete" : "complete"}
                  className={cn(
                    "space-y-1 px-3.5 py-3",
                    answer.incomplete && "bg-[rgb(var(--danger-rgb)/0.055)]",
                  )}
                >
                  <dt
                    className={cn(
                      "text-[9px] font-semibold uppercase leading-4 tracking-[0.11em]",
                      answer.incomplete
                        ? "text-[rgb(var(--danger-rgb))]"
                        : "text-[rgb(var(--accent)/0.9)]",
                    )}
                  >
                    {answer.label}
                  </dt>
                  <dd
                    className={cn(
                      "whitespace-pre-wrap text-xs font-medium leading-5",
                      answer.incomplete
                        ? "text-[rgb(var(--danger-rgb)/0.96)]"
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
