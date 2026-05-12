export const CURATED_ONBOARDING_FEATURE_FLAG = "NEXT_PUBLIC_ENABLE_CURATED_ONBOARDING";

const ENABLED_FLAG_VALUES = new Set(["1", "true", "yes", "on", "enabled"]);
const DISABLED_FLAG_VALUES = new Set(["0", "false", "no", "off", "disabled"]);

export const FITNESS_FEATURE_FLAGS = {
  curatedOnboarding: {
    label: "Curated onboarding",
    envVar: CURATED_ONBOARDING_FEATURE_FLAG,
    defaultValue: false,
    description: "Enables the guided curated onboarding flow.",
  },
  earnedInstallPromptTiming: {
    label: "Earned install prompt timing",
    envVar: "FITNESS_FLAG_EARNED_INSTALL_PROMPT_TIMING",
    defaultValue: true,
    description: "Allows earned post-workout install prompts to render when the device supports install.",
  },
  premiumCycleAnalyticsPreview: {
    label: "Premium cycle analytics preview",
    envVar: "FITNESS_FLAG_PREMIUM_CYCLE_ANALYTICS_PREVIEW",
    defaultValue: false,
    description: "Gates future premium/cycle analytics preview placement.",
  },
  progressionUpdatesSurface: {
    label: "Progression Updates surface",
    envVar: "FITNESS_FLAG_PROGRESSION_UPDATES_SURFACE",
    defaultValue: true,
    description: "Controls the Today/Routines Progression Updates tray.",
  },
  shareableRecapArtifacts: {
    label: "Shareable recap artifacts",
    envVar: "FITNESS_FLAG_SHAREABLE_RECAP_ARTIFACTS",
    defaultValue: false,
    description: "Gates deterministic workout recap artifacts on history/session surfaces.",
  },
  qaProgressionDevSurfaces: {
    label: "QA progression dev surfaces",
    envVar: "FITNESS_FLAG_QA_PROGRESSION_DEV_SURFACES",
    defaultValue: true,
    description: "Documents access intent for progression scenario/audit QA surfaces.",
  },
} as const;

export type FitnessFeatureFlagName = keyof typeof FITNESS_FEATURE_FLAGS;
export type FeatureFlagSource = "default" | "env";

export type FitnessFeatureFlagDiagnostic = {
  name: FitnessFeatureFlagName;
  label: string;
  envVar: string;
  value: boolean;
  defaultValue: boolean;
  source: FeatureFlagSource;
  rawValue: string | null;
  description: string;
};

type EnvLookup = Record<string, string | undefined>;

export function parseFeatureFlagValue(value: string | undefined | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (ENABLED_FLAG_VALUES.has(normalized)) {
    return true;
  }

  if (DISABLED_FLAG_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

export function resolveFeatureFlag(
  name: FitnessFeatureFlagName,
  env: EnvLookup = process.env,
): FitnessFeatureFlagDiagnostic {
  const definition = FITNESS_FEATURE_FLAGS[name];
  const rawValue = env[definition.envVar] ?? null;
  const parsed = parseFeatureFlagValue(rawValue);

  return {
    name,
    label: definition.label,
    envVar: definition.envVar,
    value: parsed ?? definition.defaultValue,
    defaultValue: definition.defaultValue,
    source: parsed === null ? "default" : "env",
    rawValue,
    description: definition.description,
  };
}

export function isFeatureEnabled(
  name: FitnessFeatureFlagName,
  env: EnvLookup = process.env,
) {
  return resolveFeatureFlag(name, env).value;
}

export function listFeatureFlagDiagnostics(env: EnvLookup = process.env) {
  return (Object.keys(FITNESS_FEATURE_FLAGS) as FitnessFeatureFlagName[])
    .map((name) => resolveFeatureFlag(name, env));
}

export function resolveFeatureFlagByName(
  name: string,
  env: EnvLookup = process.env,
) {
  return Object.prototype.hasOwnProperty.call(FITNESS_FEATURE_FLAGS, name)
    ? resolveFeatureFlag(name as FitnessFeatureFlagName, env)
    : null;
}

export function isCuratedOnboardingEnabled() {
  return isFeatureEnabled("curatedOnboarding");
}
