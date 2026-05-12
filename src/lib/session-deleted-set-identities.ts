export type StableSetIdentityLike = {
  id: string;
  client_log_id?: string | null;
  stableId?: string;
};

export function getDeletedSetIdentityKeys(set: StableSetIdentityLike) {
  return [
    set.stableId?.trim(),
    set.client_log_id?.trim(),
    set.id.trim(),
  ].filter((value): value is string => Boolean(value && value.length > 0));
}

export function filterDeletedDisplaySets<T extends StableSetIdentityLike>(sets: T[], deletedSetIdentityKeys: Set<string>) {
  if (deletedSetIdentityKeys.size === 0) {
    return sets;
  }

  return sets.filter((set) => !getDeletedSetIdentityKeys(set).some((key) => deletedSetIdentityKeys.has(key)));
}

export function addDeletedSetIdentityKeys(target: Set<string>, set: StableSetIdentityLike) {
  for (const key of getDeletedSetIdentityKeys(set)) {
    target.add(key);
  }
}

export function removeDeletedSetIdentityKeys(target: Set<string>, set: StableSetIdentityLike) {
  for (const key of getDeletedSetIdentityKeys(set)) {
    target.delete(key);
  }
}
