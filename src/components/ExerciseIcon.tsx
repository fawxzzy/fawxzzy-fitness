import type { CSSProperties, SVGProps } from "react";

export type ExerciseIconKind =
  | "squat"
  | "bench"
  | "hinge"
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

export type ExerciseIconEquipment = "barbell" | "dumbbell" | "cable" | "machine" | "cardio" | "bodyweight" | "other";

type ExerciseIconProps = {
  kind: ExerciseIconKind;
  equipment?: ExerciseIconEquipment;
  size?: number;
  className?: string;
};

const strokeWidth = 2.2;
const personStyle: CSSProperties = {
  fill: "var(--exercise-icon-person, #0b0b0b)",
  stroke: "var(--exercise-icon-outline, #ffffff)",
  strokeWidth,
  strokeLinejoin: "round",
  strokeLinecap: "round",
};

const equipmentStyle: CSSProperties = {
  fill: "var(--exercise-icon-accent, #1f7a3a)",
  stroke: "var(--exercise-icon-outline, #ffffff)",
  strokeWidth,
  strokeLinejoin: "round",
  strokeLinecap: "round",
};

function PersonHead() {
  return <circle cx="24" cy="14" r="4.4" style={personStyle} />;
}

function drawEquipment(equipment: ExerciseIconEquipment) {
  if (equipment === "barbell") {
    return (
      <g style={equipmentStyle}>
        <rect x="8" y="22" width="48" height="4" rx="1.2" />
        <rect x="6" y="19" width="3" height="10" rx="0.9" />
        <rect x="55" y="19" width="3" height="10" rx="0.9" />
        <rect x="10" y="20" width="2" height="8" rx="0.6" />
        <rect x="52" y="20" width="2" height="8" rx="0.6" />
      </g>
    );
  }

  if (equipment === "dumbbell") {
    return (
      <g style={equipmentStyle}>
        <rect x="38" y="24" width="12" height="3" rx="1" />
        <rect x="36" y="22" width="2" height="7" rx="0.8" />
        <rect x="50" y="22" width="2" height="7" rx="0.8" />
      </g>
    );
  }

  if (equipment === "cable") {
    return (
      <g style={equipmentStyle}>
        <rect x="50" y="8" width="6" height="48" rx="2" />
        <circle cx="53" cy="16" r="2" />
        <path d="M53 18 L43 28" fill="none" />
      </g>
    );
  }

  if (equipment === "cardio") {
    return (
      <g style={equipmentStyle}>
        <rect x="41" y="36" width="15" height="4" rx="2" />
        <circle cx="44" cy="44" r="3.5" />
        <circle cx="54" cy="44" r="3.5" />
      </g>
    );
  }

  if (equipment === "machine") {
    return (
      <g style={equipmentStyle}>
        <rect x="44" y="10" width="12" height="44" rx="2" />
        <rect x="37" y="30" width="8" height="4" rx="1" />
      </g>
    );
  }

  return null;
}

function poseByKind(kind: ExerciseIconKind): SVGProps<SVGGElement>["children"] {
  switch (kind) {
    case "squat":
      return (
        <>
          <PersonHead />
          <path d="M24 19 L24 30 L16 36 L14 47 L23 47 L25 39 L31 39 L33 47 L42 47 L39 35 L31 30 L31 19 Z" style={personStyle} />
        </>
      );
    case "bench":
      return (
        <>
          <PersonHead />
          <path d="M20 20 L20 28 L30 31 L37 31 L41 34 L35 37 L29 35 L20 33 L15 32 L13 27 L14 22 Z" style={personStyle} />
          <rect x="9" y="36" width="30" height="4" rx="1" style={equipmentStyle} />
        </>
      );
    case "hinge":
      return (
        <>
          <PersonHead />
          <path d="M24 19 L24 29 L18 35 L16 45 L24 45 L27 38 L33 34 L40 34 L41 28 L33 28 L29 31 L31 20 Z" style={personStyle} />
        </>
      );
    case "overhead_press":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L26 20 L27 32 L31 47 L23 47 L20 33 Z" style={personStyle} />
          <path d="M20 22 L12 18 L10 22 L19 27 Z" style={personStyle} />
          <path d="M28 22 L36 18 L38 22 L29 27 Z" style={personStyle} />
        </>
      );
    case "row":
      return (
        <>
          <PersonHead />
          <path d="M24 19 L24 29 L18 33 L15 44 L23 44 L27 36 L35 33 L41 33 L40 27 L32 27 L29 29 L31 20 Z" style={personStyle} />
        </>
      );
    case "pulldown":
      return (
        <>
          <PersonHead />
          <path d="M21 20 L27 20 L29 30 L31 47 L23 47 L19 30 Z" style={personStyle} />
          <path d="M20 24 L13 28 L15 32 L22 27 Z" style={personStyle} />
          <path d="M28 24 L35 28 L33 32 L26 27 Z" style={personStyle} />
        </>
      );
    case "curl":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L27 20 L28 32 L31 47 L23 47 L20 33 Z" style={personStyle} />
          <path d="M20 24 L14 27 L17 32 L22 29 Z" style={personStyle} />
        </>
      );
    case "triceps":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L27 20 L29 33 L32 47 L24 47 L20 34 Z" style={personStyle} />
          <path d="M28 24 L35 30 L32 34 L26 27 Z" style={personStyle} />
        </>
      );
    case "fly":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L27 20 L28 32 L31 47 L23 47 L20 33 Z" style={personStyle} />
          <path d="M21 24 L10 24 L10 29 L21 29 Z" style={personStyle} />
          <path d="M28 24 L39 24 L39 29 L28 29 Z" style={personStyle} />
        </>
      );
    case "lunge":
      return (
        <>
          <PersonHead />
          <path d="M23 20 L28 20 L30 31 L36 35 L42 47 L34 47 L29 39 L24 39 L21 47 L12 47 L16 36 L22 31 Z" style={personStyle} />
        </>
      );
    case "hip_thrust":
      return (
        <>
          <PersonHead />
          <path d="M20 22 L26 22 L29 29 L39 29 L42 36 L34 36 L30 33 L20 33 L14 37 L10 33 L15 28 Z" style={personStyle} />
          <rect x="8" y="36" width="30" height="4" rx="1" style={equipmentStyle} />
        </>
      );
    case "calf_raise":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L27 20 L28 33 L31 47 L23 47 L20 33 Z" style={personStyle} />
          <rect x="12" y="47" width="24" height="4" rx="1.5" style={equipmentStyle} />
        </>
      );
    case "core":
      return (
        <>
          <PersonHead />
          <path d="M18 25 L26 25 L33 30 L42 31 L42 37 L32 36 L24 36 L16 33 L12 33 L12 28 Z" style={personStyle} />
          <circle cx="47" cy="35" r="5" style={equipmentStyle} />
        </>
      );
    case "cardio":
      return (
        <>
          <PersonHead />
          <path d="M23 20 L28 20 L29 30 L37 34 L35 39 L28 36 L24 47 L16 47 L20 35 Z" style={personStyle} />
        </>
      );
    case "machine_other":
      return (
        <>
          <PersonHead />
          <path d="M22 20 L27 20 L28 33 L31 47 L23 47 L20 33 Z" style={personStyle} />
          <rect x="42" y="12" width="13" height="36" rx="2" style={equipmentStyle} />
        </>
      );
    default:
      return null;
  }
}

export function ExerciseIcon({ kind, equipment = "other", size = 48, className }: ExerciseIconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      role="img"
    >
      <g>{poseByKind(kind)}</g>
      <g>{drawEquipment(equipment)}</g>
    </svg>
  );
}
