import { cn } from "@/lib/cn";
import {
  getArrayResponse,
  getStringResponse,
} from "../questionnaire.ts";
import type {
  CuratedIntakeResponse,
  CuratedIntakeResponses,
  CuratedIntakeSection,
  CuratedQuestionDefinition,
} from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

function ChoiceIndicator({ selected, multiple }: { selected: boolean; multiple: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center border transition-colors",
        multiple ? "rounded-[4px]" : "rounded-full",
        selected
          ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.22)] shadow-[0_0_10px_rgb(var(--accent)/0.2)]"
          : "border-[rgb(var(--border-strong)/0.58)] bg-[rgb(var(--surface-0-rgb)/0.5)]",
      )}
    >
      {selected ? <span className={cn("bg-[rgb(var(--accent))]", multiple ? "h-2 w-2 rounded-[2px]" : "h-2 w-2 rounded-full")} /> : null}
    </span>
  );
}

function TextQuestion({
  question,
  responses,
  invalid,
  onResponseChange,
}: {
  question: CuratedQuestionDefinition;
  responses: CuratedIntakeResponses;
  invalid: boolean;
  onResponseChange: (questionId: string, value: CuratedIntakeResponse) => void;
}) {
  const sharedClassName = cn(
    "w-full border-0 border-b bg-transparent px-0 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none transition-colors placeholder:text-[rgb(var(--text-muted)/0.62)] focus:border-[rgb(var(--accent))]",
    invalid ? "border-[rgb(var(--danger-rgb)/0.82)]" : "border-[rgb(var(--border-strong)/0.34)]",
  );

  if (question.type === "long-text") {
    return (
      <textarea
        value={getStringResponse(responses, question.id)}
        onChange={(event) => onResponseChange(question.id, event.target.value)}
        placeholder={question.placeholder ?? "Your answer"}
        rows={3}
        aria-invalid={invalid || undefined}
        className={cn(sharedClassName, "min-h-24 resize-y leading-6")}
      />
    );
  }

  return (
    <input
      value={getStringResponse(responses, question.id)}
      onChange={(event) => onResponseChange(question.id, event.target.value)}
      placeholder={question.placeholder ?? "Your answer"}
      readOnly={question.readOnly}
      aria-invalid={invalid || undefined}
      className={cn(sharedClassName, question.readOnly && "cursor-default text-[rgb(var(--text-secondary))]")}
    />
  );
}

function ChoiceQuestion({
  question,
  responses,
  invalid,
  onResponseChange,
}: {
  question: CuratedQuestionDefinition;
  responses: CuratedIntakeResponses;
  invalid: boolean;
  onResponseChange: (questionId: string, value: CuratedIntakeResponse) => void;
}) {
  const multiple = question.type === "multi";
  const selectedValues = multiple ? getArrayResponse(responses, question.id) : [];
  const selectedValue = multiple ? "" : getStringResponse(responses, question.id);

  function toggle(value: string) {
    if (!multiple) {
      onResponseChange(question.id, value);
      return;
    }

    onResponseChange(
      question.id,
      selectedValues.includes(value)
        ? selectedValues.filter((entry) => entry !== value)
        : [...selectedValues, value],
    );
  }

  const choices = [
    ...(question.options ?? []),
    ...(question.allowOther ? [{ value: "other", label: "Other" }] : []),
  ];
  const otherSelected = multiple ? selectedValues.includes("other") : selectedValue === "other";

  return (
    <div className="space-y-2" role={multiple ? "group" : "radiogroup"} aria-invalid={invalid || undefined}>
      {choices.map((option) => {
        const selected = multiple ? selectedValues.includes(option.value) : selectedValue === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            onClick={() => toggle(option.value)}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-[calc(var(--card-radius)-6px)] border px-3 py-2.5 text-left text-[13px] font-medium leading-5 transition-[border-color,background-color,color,box-shadow]",
              selected
                ? "border-[rgb(var(--accent)/0.62)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))] shadow-[0_0_0_1px_rgb(var(--accent)/0.08)]"
                : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-0-rgb)/0.24)] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent)/0.34)]",
            )}
          >
            <ChoiceIndicator selected={selected} multiple={multiple} />
            <span className="min-w-0 whitespace-normal break-words">{option.label}</span>
          </button>
        );
      })}

      {otherSelected ? (
        <input
          value={getStringResponse(responses, `${question.id}Other`)}
          onChange={(event) => onResponseChange(`${question.id}Other`, event.target.value)}
          placeholder="Other response"
          className="mt-1 w-full border-0 border-b border-[rgb(var(--border-strong)/0.34)] bg-transparent px-0 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none placeholder:text-[rgb(var(--text-muted)/0.62)] focus:border-[rgb(var(--accent))]"
        />
      ) : null}
    </div>
  );
}

function AcknowledgmentQuestion({
  question,
  responses,
  invalid,
  onResponseChange,
}: {
  question: CuratedQuestionDefinition;
  responses: CuratedIntakeResponses;
  invalid: boolean;
  onResponseChange: (questionId: string, value: CuratedIntakeResponse) => void;
}) {
  const selected = responses[question.id] === true;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-invalid={invalid || undefined}
      onClick={() => onResponseChange(question.id, !selected)}
      className={cn(
        "flex w-full items-start gap-3 rounded-[calc(var(--card-radius)-6px)] border px-3 py-3 text-left text-[13px] font-medium leading-5 transition-[border-color,background-color]",
        selected
          ? "border-[rgb(var(--accent)/0.62)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
          : invalid
            ? "border-[rgb(var(--danger-rgb)/0.58)] bg-[rgb(var(--danger-rgb)/0.06)] text-[rgb(var(--text-secondary))]"
            : "border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-0-rgb)/0.24)] text-[rgb(var(--text-secondary))]",
      )}
    >
      <ChoiceIndicator selected={selected} multiple />
      <span>{question.label}</span>
    </button>
  );
}

export function QuestionnaireStep({
  section,
  responses,
  invalidQuestionIds,
  onResponseChange,
}: {
  section: CuratedIntakeSection;
  responses: CuratedIntakeResponses;
  invalidQuestionIds: readonly string[];
  onResponseChange: (questionId: string, value: CuratedIntakeResponse) => void;
}) {
  return (
    <div className="space-y-3">
      {section.stepId === "intro" ? (
        <CuratedInfoCard tone="accent" className="space-y-2">
          <p className="text-sm font-semibold leading-6 text-[rgb(var(--text-primary))]">{section.description}</p>
          <p className="text-xs leading-5 text-[rgb(var(--text-muted)/0.92)]">
            This is general fitness guidance, not medical advice. If you have pain, injuries, medical conditions, or symptoms during exercise, talk to a qualified medical professional before starting or changing your routine.
          </p>
        </CuratedInfoCard>
      ) : null}

      <CuratedInfoCard className="!p-0">
        <div className="border-b border-[rgb(var(--accent)/0.34)] bg-[linear-gradient(90deg,rgb(var(--accent)/0.2),rgb(var(--surface-1-rgb)/0.44))] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--accent)/0.96)]">{section.title}</p>
        </div>

        <div className="divide-y divide-[rgb(var(--border-strong)/0.14)]">
          {section.questions.map((question) => {
            const invalid = invalidQuestionIds.includes(question.id);
            const notice = section.notices?.find((entry) => entry.afterQuestionId === question.id);
            return (
              <div key={question.id}>
                <div
                  data-curated-question={question.id}
                  className={cn("space-y-3 px-4 py-4", invalid && "bg-[rgb(var(--danger-rgb)/0.035)]")}
                >
                  {question.type !== "acknowledgment" ? (
                    <p className="text-sm font-semibold leading-5 text-[rgb(var(--text-primary))]">
                      {question.label}
                      {question.required ? <span className="ml-1 text-[rgb(var(--warning-rgb))]">*</span> : null}
                    </p>
                  ) : null}

                  {question.type === "short-text" || question.type === "long-text" ? (
                    <TextQuestion
                      question={question}
                      responses={responses}
                      invalid={invalid}
                      onResponseChange={onResponseChange}
                    />
                  ) : question.type === "acknowledgment" ? (
                    <AcknowledgmentQuestion
                      question={question}
                      responses={responses}
                      invalid={invalid}
                      onResponseChange={onResponseChange}
                    />
                  ) : (
                    <ChoiceQuestion
                      question={question}
                      responses={responses}
                      invalid={invalid}
                      onResponseChange={onResponseChange}
                    />
                  )}

                  {invalid ? (
                    <p role="alert" className="text-[11px] font-medium text-[rgb(var(--danger-rgb))]">This is a required question</p>
                  ) : null}
                </div>

                {notice ? (
                  <div className="border-t border-[rgb(var(--warning-rgb)/0.25)] bg-[rgb(var(--warning-rgb)/0.07)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--warning-rgb))]">{notice.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary)/0.94)]">{notice.body}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CuratedInfoCard>
    </div>
  );
}
