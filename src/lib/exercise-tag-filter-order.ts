export type ExerciseTagGroupByOption = {
  key: string;
  label: string;
};

export function orderGroupByOptions(options: readonly ExerciseTagGroupByOption[], selectedGroupKeys: readonly string[]) {
  if (selectedGroupKeys.length === 0) {
    return [...options];
  }

  const selectedKeySet = new Set(selectedGroupKeys);
  const selected = selectedGroupKeys
    .map((selectedKey) => options.find((option) => option.key === selectedKey))
    .filter((option): option is ExerciseTagGroupByOption => Boolean(option));

  return [
    ...selected,
    ...options.filter((option) => !selectedKeySet.has(option.key)),
  ];
}

export function hasActiveGroupBySelection(selectedGroupKeys: readonly string[]) {
  return selectedGroupKeys.length > 0;
}

export function clearGroupBySelection() {
  return [] as string[];
}

export function toggleGroupBySelection(current: readonly string[], nextKey: string) {
  return current.includes(nextKey)
    ? current.filter((key) => key !== nextKey)
    : [...current, nextKey];
}
