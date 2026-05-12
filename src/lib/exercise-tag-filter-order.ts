export type ExerciseTagGroupByOption = {
  key: string;
  label: string;
};

export function orderGroupByOptions(options: readonly ExerciseTagGroupByOption[], selectedGroupKey: string | null) {
  if (!selectedGroupKey) {
    return [...options];
  }

  const selected = options.find((option) => option.key === selectedGroupKey);
  if (!selected) {
    return [...options];
  }

  return [
    selected,
    ...options.filter((option) => option.key !== selectedGroupKey),
  ];
}

export function hasActiveGroupBySelection(selectedGroupKey: string | null) {
  return Boolean(selectedGroupKey);
}

export function clearGroupBySelection() {
  return null;
}

export function toggleGroupBySelection(current: string | null, nextKey: string) {
  return current === nextKey ? null : nextKey;
}
