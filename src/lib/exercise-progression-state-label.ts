import { normalizeDecoratedText } from "@/lib/text-separator-normalization";

type ExerciseProgressionStateSource = {
  progression_playbook_id?: string | null;
  progression_playbook_config?: Record<string, unknown> | null;
};

export function buildExerciseProgressionStateLabel(source: ExerciseProgressionStateSource) {
  const hasAutoProgression = Boolean(source.progression_playbook_id);
  const stateLabels = [hasAutoProgression ? "AUTO" : "MANUAL"];

  if (hasAutoProgression) {
    const config = source.progression_playbook_config;
    if (config?.sessionSettingsEnabled !== false) {
      stateLabels.push("SESSION");
    }
    if (config?.setSettingsEnabled !== false) {
      stateLabels.push("SET");
    }
  }

  return normalizeDecoratedText(stateLabels.join(" • "));
}

/**
 * Plain words for the exercise progression tag on day recaps (FUNCTIONAL.md F-020). The shared recap builder
 * emits engine flags ("AUTO • SESSION • SET", "MANUAL"); routine screens show "Auto progression" for an
 * exercise with an auto-progression plan and nothing for manual (the default needs no tag).
 */
export function toPlainProgressionLabel(label: string | null | undefined): string | null {
  const flags = (label ?? "").toUpperCase().split(/[\s•|·,]+/).filter(Boolean);
  return flags.includes("AUTO") ? "Auto progression" : null;
}
