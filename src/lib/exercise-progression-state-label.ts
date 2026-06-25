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
