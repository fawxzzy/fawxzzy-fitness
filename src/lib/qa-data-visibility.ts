import type { ProfileRow } from "@/types/db";

export const QA_LLEL_VISIBILITY_COOKIE = "fitness_show_qa_llel_data";

export const QA_LLEL_PREFIXES = [
  "[ZAC-LLEL]",
  "[QA-PROGRESSION]",
  "[QA-FULL-ROUTINE]",
] as const;

function normalizeLabel(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isQaLlelLabel(value: string | null | undefined) {
  const normalized = normalizeLabel(value);
  return normalized.length > 0 && QA_LLEL_PREFIXES.some((prefix) => normalized.startsWith(prefix.toLowerCase()));
}

export function hasQaLlelMarker(values: Array<string | null | undefined>) {
  return values.some((value) => isQaLlelLabel(value));
}

export function resolveShowQaLlelDataPreference(profile: Pick<ProfileRow, "show_qa_llel_data" | "user_kind">) {
  if (typeof profile.show_qa_llel_data === "boolean") {
    return profile.show_qa_llel_data;
  }

  return profile.user_kind === "automation";
}

export function resolveQaLlelVisibilityOverride(value: string | null | undefined) {
  if (value === "1") {
    return true;
  }

  if (value === "0") {
    return false;
  }

  return null;
}

export function resolveShowQaLlelDataPreferenceWithOverride(
  profile: Pick<ProfileRow, "show_qa_llel_data" | "user_kind">,
  override: boolean | null,
) {
  if (typeof override === "boolean") {
    return override;
  }

  return resolveShowQaLlelDataPreference(profile);
}

export function canAccessQaLlelUi(profile: Pick<ProfileRow, "user_kind" | "user_number">) {
  return profile.user_kind === "automation" || profile.user_number === 0;
}

export function canAccessQaLlelVisibilitySetting(profile: Pick<ProfileRow, "user_number">) {
  return profile.user_number === 0;
}

export function filterQaLlelRows<T>(rows: T[], getLabels: (row: T) => Array<string | null | undefined>) {
  return rows.filter((row) => !hasQaLlelMarker(getLabels(row)));
}
