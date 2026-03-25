type LogSetLanguageInput = {
  isCardio: boolean;
  measurementType?: string | null;
  exerciseName?: string | null;
  exerciseSlug?: string | null;
};

const INTERVAL_TOKENS = ["interval", "intervals", "sprint", "sprints", "tabata", "hiit", "emom", "amrap"];

function hasIntervalToken(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return INTERVAL_TOKENS.some((token) => normalized.includes(token));
}

export function usesIntervalLanguage(input: LogSetLanguageInput) {
  if (!input.isCardio) return false;
  if (hasIntervalToken(input.exerciseName) || hasIntervalToken(input.exerciseSlug)) {
    return true;
  }

  const measurementType = input.measurementType?.trim().toLowerCase();
  return measurementType === "time";
}

export function getLogSetNoun(useIntervalLanguage: boolean) {
  return useIntervalLanguage ? "Interval" : "Set";
}
