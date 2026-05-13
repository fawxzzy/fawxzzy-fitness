import {
  resolveCapabilityAnchor,
  type CapabilityAnchor,
  type TargetSnapshot,
} from "@/lib/capability-anchors";

export type FocusTargetSeedId =
  | "strength"
  | "speed_power"
  | "hypertrophy"
  | "technique"
  | "rehab";

export type FocusTargetSeedResult = {
  focus: FocusTargetSeedId;
  status: "generated" | "manual_fallback";
  source: CapabilityAnchor["source"];
  target: TargetSnapshot | null;
  summary: string;
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function cloneSnapshot(snapshot: TargetSnapshot | null | undefined): TargetSnapshot | null {
  return snapshot ? { ...snapshot } : null;
}

function pickSeedSnapshot(anchor: CapabilityAnchor) {
  return cloneSnapshot(anchor.best ?? anchor.last ?? anchor.pr ?? anchor.average);
}

function applyWeightPercent(snapshot: TargetSnapshot, percent: number) {
  if (!isPositiveNumber(snapshot.weight)) {
    return snapshot;
  }

  return {
    ...snapshot,
    weight: Number((snapshot.weight * percent).toFixed(4)),
  };
}

function applyRepDelta(snapshot: TargetSnapshot, delta: number) {
  if (!isPositiveNumber(snapshot.reps)) {
    return snapshot;
  }

  return {
    ...snapshot,
    reps: Math.max(1, Math.round(snapshot.reps + delta)),
  };
}

export function buildFocusTargetSeed(args: {
  focus: FocusTargetSeedId;
  anchor?: CapabilityAnchor | null;
}): FocusTargetSeedResult {
  const anchor = args.anchor ?? resolveCapabilityAnchor({});
  const baseSnapshot = pickSeedSnapshot(anchor);

  if (!baseSnapshot) {
    return {
      focus: args.focus,
      status: "manual_fallback",
      source: anchor.source,
      target: null,
      summary: "No recent capability anchor is available yet. Start from a manual baseline and review before saving.",
    };
  }

  switch (args.focus) {
  case "strength": {
    const heavier = applyWeightPercent(baseSnapshot, 1.03);
    const lowerRep = applyRepDelta(heavier, -2);
    return {
      focus: args.focus,
      status: "generated",
      source: anchor.source,
      target: lowerRep,
      summary: "Strength focus seeds a slightly heavier target with fewer reps than the current anchor.",
    };
  }
  case "speed_power": {
    const lighter = applyWeightPercent(baseSnapshot, 0.7);
    const lowerRep = applyRepDelta(lighter, -1);
    return {
      focus: args.focus,
      status: "generated",
      source: anchor.source,
      target: lowerRep,
      summary: "Speed focus suggests a lighter target and faster intent. It does not claim measured velocity without speed data.",
    };
  }
  case "hypertrophy": {
    const moderated = applyWeightPercent(baseSnapshot, 0.92);
    const higherRep = applyRepDelta(moderated, 2);
    return {
      focus: args.focus,
      status: "generated",
      source: anchor.source,
      target: higherRep,
      summary: "Muscle focus keeps load moderate and nudges reps up from the current anchor.",
    };
  }
  case "technique": {
    const lighter = applyWeightPercent(baseSnapshot, 0.8);
    return {
      focus: args.focus,
      status: "generated",
      source: anchor.source,
      target: lighter,
      summary: "Technique focus lightens the target for cleaner execution and explicit review.",
    };
  }
  case "rehab":
  default: {
    const lighter = applyWeightPercent(baseSnapshot, 0.65);
    return {
      focus: args.focus,
      status: "generated",
      source: anchor.source,
      target: lighter,
      summary: "Rehab focus keeps the target conservative and review-friendly rather than pushing progression.",
    };
  }
  }
}
