export const FITNESS_LEGACY_COMPATIBILITY_SOURCE = "fitness_legacy_origin" as const;

export function buildFitnessLegacyOriginAnalyticsPayload() {
  return {
    compatibility: FITNESS_LEGACY_COMPATIBILITY_SOURCE,
    event: "compatibility_visit",
    product: "fitness",
    route: "app",
  } as const;
}

export function consumeFitnessLegacyOriginMarker(value: string) {
  const url = new URL(value);
  const matched =
    url.searchParams.get("compatibility") === FITNESS_LEGACY_COMPATIBILITY_SOURCE;
  if (matched) url.searchParams.delete("compatibility");
  return {
    matched,
    replacement: `${url.pathname}${url.search}${url.hash}`,
  };
}
