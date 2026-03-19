export function isSafeAppPath(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function resolveReturnHref(rawReturnTo: string | null | undefined, fallbackHref: string): string {
  return isSafeAppPath(rawReturnTo) ? rawReturnTo : fallbackHref;
}
