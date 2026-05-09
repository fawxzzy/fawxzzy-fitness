export const DEFAULT_PROGRESSION_STEP_OVERRIDES = {
  barbellLoadIncrement: 10,
  dumbbellLoadIncrement: 5,
  machineLoadIncrement: 15,
  cableLoadIncrement: 15,
  bodyweightRepIncrement: 5,
  durationSecondsIncrement: 30,
  distanceIncrement: 0.5,
} as const;

export const DEFAULT_SET_FLOW_STEPS = {
  loadStep: 5,
  repStep: 2,
  durationSecondsStep: 30,
  distanceStep: 0.5,
} as const;
