export const SESSION_COPILOT_FEEDBACK_SIGNALS = [
  "completed_as_planned",
  "too_easy",
  "too_hard",
  "form_breakdown",
  "pain_flag",
  "bad_day",
  "override_used",
] as const;

export type SessionCopilotFeedbackSignal = (typeof SESSION_COPILOT_FEEDBACK_SIGNALS)[number];

export const SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH = 240;

const SESSION_COPILOT_FEEDBACK_LABELS: Record<SessionCopilotFeedbackSignal, string> = {
  completed_as_planned: "As Planned",
  too_easy: "Too Easy",
  too_hard: "Too Hard",
  form_breakdown: "Form",
  pain_flag: "Pain",
  bad_day: "Bad Day",
  override_used: "Override",
};

export function normalizeSessionCopilotFeedbackSignal(value: unknown): SessionCopilotFeedbackSignal | null {
  return typeof value === "string" && SESSION_COPILOT_FEEDBACK_SIGNALS.includes(value as SessionCopilotFeedbackSignal)
    ? value as SessionCopilotFeedbackSignal
    : null;
}

export function normalizeSessionCopilotFeedbackNote(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH);
}

export function formatSessionCopilotFeedbackLabel(signal: SessionCopilotFeedbackSignal): string {
  return SESSION_COPILOT_FEEDBACK_LABELS[signal];
}

export function getSessionCopilotFeedbackTone(signal: SessionCopilotFeedbackSignal): "default" | "success" | "warning" | "destructive" {
  switch (signal) {
    case "completed_as_planned":
      return "success";
    case "too_easy":
    case "override_used":
      return "default";
    case "too_hard":
    case "bad_day":
      return "warning";
    case "form_breakdown":
    case "pain_flag":
      return "destructive";
    default:
      return "default";
  }
}
