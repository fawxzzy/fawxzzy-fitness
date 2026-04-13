const CURATED_ONBOARDING_FEATURE_FLAG = "NEXT_PUBLIC_ENABLE_CURATED_ONBOARDING";
const ENABLED_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);

function isEnabledValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ENABLED_FLAG_VALUES.has(value.trim().toLowerCase());
}

export function isCuratedOnboardingEnabled() {
  return isEnabledValue(process.env[CURATED_ONBOARDING_FEATURE_FLAG]);
}

export { CURATED_ONBOARDING_FEATURE_FLAG };
