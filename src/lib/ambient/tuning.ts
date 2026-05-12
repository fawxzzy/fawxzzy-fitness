export type AmbientPreset =
  | "today"
  | "history"
  | "viewDay"
  | "editDay"
  | "logSet"
  | "modal";

export type AmbientSkyTuning = {
  twinkleCount: number;
  twinkleAlphaMin: number;
  twinkleAlphaMax: number;
  twinklePulseDurationMinMs: number;
  twinklePulseDurationMaxMs: number;
  twinkleDriftRangePx: number;

  driftMoteCount: number;
  driftMoteAlphaMin: number;
  driftMoteAlphaMax: number;
  driftMoteSpeedPxPerSecMin: number;
  driftMoteSpeedPxPerSecMax: number;

  hazeLayerCount: number;
  hazeAlphaMin: number;
  hazeAlphaMax: number;
};

export type SacredGeometryTuning = {
  layerCount: number;
  layerAlphaMin: number;
  layerAlphaMax: number;
  rotationDurationMinMs: number;
  rotationDurationMaxMs: number;
  driftRangePx: number;
  scalePulseMin: number;
  scalePulseMax: number;
  strokeWidthMin: number;
  strokeWidthMax: number;
};

export type AmbientPresetTuning = {
  intensity: number;
  motionMultiplier: number;
  twinkleMultiplier: number;
  geometryMultiplier: number;
  frameOpacityMultiplier?: number;
  railOpacityMultiplier?: number;
  railMotionMultiplier?: number;
};

export type AmbientReducedMotionTuning = {
  motionMultiplier: number;
  twinkleMultiplier: number;
  geometryMultiplier: number;
  frameOpacityMultiplier: number;
  railOpacityMultiplier: number;
  railMotionMultiplier: number;
};

const createAmbientSkyTuning = (): AmbientSkyTuning => ({
  twinkleCount: 18,
  twinkleAlphaMin: 0.08,
  twinkleAlphaMax: 0.24,
  twinklePulseDurationMinMs: 2400,
  twinklePulseDurationMaxMs: 7600,
  twinkleDriftRangePx: 6,

  driftMoteCount: 7,
  driftMoteAlphaMin: 0.03,
  driftMoteAlphaMax: 0.12,
  driftMoteSpeedPxPerSecMin: 0.4,
  driftMoteSpeedPxPerSecMax: 1.1,

  hazeLayerCount: 3,
  hazeAlphaMin: 0.05,
  hazeAlphaMax: 0.12,
});

const createSacredGeometryTuning = (): SacredGeometryTuning => ({
  layerCount: 3,
  layerAlphaMin: 0.035,
  layerAlphaMax: 0.085,
  rotationDurationMinMs: 90000,
  rotationDurationMaxMs: 180000,
  driftRangePx: 12,
  scalePulseMin: 0.985,
  scalePulseMax: 1.025,
  strokeWidthMin: 0.8,
  strokeWidthMax: 1.4,
});

const createPreset = (
  overrides: Partial<AmbientPresetTuning> = {},
): AmbientPresetTuning => ({
  intensity: 1,
  motionMultiplier: 1,
  twinkleMultiplier: 1,
  geometryMultiplier: 1,
  frameOpacityMultiplier: 1,
  railOpacityMultiplier: 1,
  railMotionMultiplier: 1,
  ...overrides,
});

const createReducedMotionTuning = (
  overrides: Partial<AmbientReducedMotionTuning> = {},
): AmbientReducedMotionTuning => ({
  motionMultiplier: 0.12,
  twinkleMultiplier: 0.35,
  geometryMultiplier: 0.18,
  frameOpacityMultiplier: 1.04,
  railOpacityMultiplier: 0.08,
  railMotionMultiplier: 0.01,
  ...overrides,
});

export const ambientBackdropTuning = {
  sky: createAmbientSkyTuning(),
  geometry: createSacredGeometryTuning(),
  presets: {
    today: createPreset({
      intensity: 1,
      motionMultiplier: 1,
      twinkleMultiplier: 1,
      geometryMultiplier: 1,
    }),
    history: createPreset({
      intensity: 1.02,
      motionMultiplier: 0.98,
      twinkleMultiplier: 0.92,
      geometryMultiplier: 1.05,
      frameOpacityMultiplier: 1.08,
      railOpacityMultiplier: 1.08,
      railMotionMultiplier: 0.96,
    }),
    viewDay: createPreset({
      intensity: 0.82,
      motionMultiplier: 0.75,
      twinkleMultiplier: 0.6,
      geometryMultiplier: 0.78,
      frameOpacityMultiplier: 1.02,
      railOpacityMultiplier: 0.86,
      railMotionMultiplier: 0.78,
    }),
    editDay: createPreset({
      intensity: 0.55,
      motionMultiplier: 0.45,
      twinkleMultiplier: 0.35,
      geometryMultiplier: 0.52,
      frameOpacityMultiplier: 1.12,
      railOpacityMultiplier: 0.56,
      railMotionMultiplier: 0.38,
    }),
    logSet: createPreset({
      intensity: 0.42,
      motionMultiplier: 0.35,
      twinkleMultiplier: 0.18,
      geometryMultiplier: 0.45,
      frameOpacityMultiplier: 1.18,
      railOpacityMultiplier: 0.44,
      railMotionMultiplier: 0.28,
    }),
    modal: createPreset({
      intensity: 0.18,
      motionMultiplier: 0.12,
      twinkleMultiplier: 0.1,
      geometryMultiplier: 0.16,
      frameOpacityMultiplier: 1.36,
      railOpacityMultiplier: 0.24,
      railMotionMultiplier: 0.18,
    }),
  },
  reducedMotion: createReducedMotionTuning(),
} as const;

export const legacyTuning = ambientBackdropTuning;
