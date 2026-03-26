type LogSetLanguageInput = {
  intervalMode?: boolean | null;
};

export function usesIntervalLanguage(input: LogSetLanguageInput) {
  return input.intervalMode === true;
}

export function getLogSetNoun(useIntervalLanguage: boolean) {
  return useIntervalLanguage ? "Interval" : "Set";
}
