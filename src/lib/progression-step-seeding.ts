import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";

export function formatProgressionStepNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function seedProgressionDraftWithStepValue(
  state: ProgressionPlaybookFormState,
  defaultStepValue: number | null | undefined,
) {
  if (!state.progressionPlaybookId || !defaultStepValue) {
    return state;
  }

  return {
    ...state,
    progressionLoadIncrement: formatProgressionStepNumber(defaultStepValue),
  };
}
