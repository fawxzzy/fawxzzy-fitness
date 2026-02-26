export type IconKind =
  | "squat"
  | "hinge"
  | "bench"
  | "overhead_press"
  | "row"
  | "pulldown"
  | "curl"
  | "triceps"
  | "fly"
  | "lunge"
  | "hip_thrust"
  | "calf_raise"
  | "core"
  | "cardio"
  | "machine_other";

export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "cardio";

export type IconSpec = {
  kind: IconKind;
  equipment: Equipment;
  variant?: string;
  unilateral?: boolean;
  angle?: "flat" | "incline" | "decline";
  grip?: "neutral" | "pronated" | "supinated" | "wide" | "close";
  cablePath?: "high_to_low" | "low_to_high" | "straight";
  stance?: "narrow" | "normal" | "wide";
};
