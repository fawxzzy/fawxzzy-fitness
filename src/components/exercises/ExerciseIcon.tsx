"use client";

import { exerciseIconMap } from "@/lib/exercises/exerciseIconMap";
import type { IconKind, IconSpec } from "@/lib/exercises/iconSpec";

type ExerciseIconProps = {
  slug: string;
  size?: number;
  className?: string;
};

const fallbackSpec: IconSpec = {
  kind: "machine_other",
  equipment: "machine",
  variant: "fallback",
  cablePath: "straight",
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function movementCue(kind: IconKind) {
  switch (kind) {
    case "squat":
      return <path d="M24 51 L32 57 L40 51" />;
    case "hinge":
      return <path d="M24 57 L40 49" />;
    case "bench":
    case "overhead_press":
      return <path d="M24 57 L32 50 L40 57" />;
    case "row":
      return <path d="M39 57 L25 57 M25 57 L30 53 M25 57 L30 61" />;
    case "pulldown":
      return <path d="M32 50 L32 60 M32 60 L28 56 M32 60 L36 56" />;
    case "curl":
      return <path d="M24 57 Q32 50 40 57" />;
    case "triceps":
      return <path d="M24 50 L32 57 L40 50" />;
    case "fly":
      return <path d="M32 57 L22 57 M22 57 L26 53 M22 57 L26 61 M32 57 L42 57 M42 57 L38 53 M42 57 L38 61" />;
    case "lunge":
      return <path d="M25 57 L35 52 L35 62" />;
    case "hip_thrust":
      return <path d="M24 58 L32 53 L40 58" />;
    case "calf_raise":
      return <path d="M32 58 L32 52 M32 52 L29 55 M32 52 L35 55" />;
    case "core":
      return (
        <>
          <circle cx="32" cy="56" r="4.2" fill="none" />
          <circle cx="32" cy="56" r="1.4" stroke="none" fill="currentColor" />
        </>
      );
    case "cardio":
      return <path d="M24 57 L30 57 L33 53 L36 61 L40 57" />;
    case "machine_other":
      return <path d="M25 57 L39 57" />;
    default:
      return null;
  }
}

export function ExerciseIcon({ slug, size = 48, className }: ExerciseIconProps) {
  const spec = exerciseIconMap[slug] ?? fallbackSpec;
  const seedKey = `${slug}|${spec.kind}|${spec.equipment}|${spec.variant ?? ""}|${spec.grip ?? ""}|${spec.angle ?? ""}|${spec.stance ?? ""}|${spec.cablePath ?? ""}|${spec.unilateral ? "1" : "0"}`;
  const seed = hashString(seedKey);

  const randomOffset = (bit: number, spread = 2) => ((seed >> bit) % (spread * 2 + 1)) - spread;
  const plateWidth = 3.6 + randomOffset(2, 1) * 0.5;
  const dumbbellHandle = 10 + randomOffset(4, 1);
  const cableTilt = randomOffset(7, 1);
  const machineStackHeight = 15 + randomOffset(9, 1) * 2;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-border bg-[rgb(var(--bg)/0.18)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[1px] ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" className="h-full w-full">
        <g className="text-accent" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          {spec.equipment === "barbell" ? (
            <>
              <rect x="14" y="30" width="36" height="4" rx="2" />
              <rect x={10.5 - plateWidth} y="26" width={plateWidth} height="12" rx="1.2" />
              <rect x="10.5" y="24" width={plateWidth + 0.8} height="16" rx="1.2" />
              <rect x="49" y="26" width={plateWidth} height="12" rx="1.2" />
              <rect x={52.5} y="24" width={plateWidth + 0.8} height="16" rx="1.2" />
            </>
          ) : null}

          {spec.equipment === "dumbbell" ? (
            <>
              <rect x={(64 - dumbbellHandle) / 2} y="30" width={dumbbellHandle} height="4" rx="2" />
              <rect x={(64 - dumbbellHandle) / 2 - 4.2} y="27" width="3.2" height="10" rx="1" />
              <rect x={(64 - dumbbellHandle) / 2 - 8} y="25.5" width="3.4" height="13" rx="1" />
              <rect x={(64 + dumbbellHandle) / 2 + 1} y="27" width="3.2" height="10" rx="1" />
              <rect x={(64 + dumbbellHandle) / 2 + 4.8} y="25.5" width="3.4" height="13" rx="1" />
            </>
          ) : null}

          {spec.equipment === "cable" ? (
            <>
              <circle cx="46" cy="16" r="4.5" fill="none" strokeWidth="2.6" />
              <path d={`M46 20 L46 30 L26 ${33 + cableTilt}`} fill="none" strokeWidth="2.6" />
              <rect x="22" y={31 + cableTilt} width="8" height="4.2" rx="1.4" strokeWidth="0" />
              <rect x="44" y="9" width="4" height="5" rx="1" strokeWidth="0" />
            </>
          ) : null}

          {spec.equipment === "machine" ? (
            <>
              <rect x="14" y="12" width="6" height="34" rx="2" />
              <rect x="14" y="12" width="36" height="4.4" rx="2" />
              <rect x="43" y={40 - machineStackHeight} width="8" height={machineStackHeight} rx="1.8" />
              <rect x="24" y="22" width="14" height="7" rx="2" />
              <path d="M38 25 L43 25" fill="none" strokeWidth="2.4" />
            </>
          ) : null}

          {spec.equipment === "cardio" ? (
            spec.variant?.includes("treadmill") ? (
              <>
                <path d="M15 44 L50 44 L46 50 L19 50 Z" strokeWidth="0" />
                <path d="M39 20 L47 20 L47 38" fill="none" strokeWidth="2.8" />
                <path d="M22 44 L30 34 L39 34" fill="none" strokeWidth="2.8" />
              </>
            ) : (
              <>
                <circle cx="22" cy="46" r="6" fill="none" strokeWidth="2.8" />
                <circle cx="42" cy="46" r="4.6" fill="none" strokeWidth="2.8" />
                <path d="M22 46 L31 32 L42 46" fill="none" strokeWidth="2.8" />
                <path d="M31 32 L38 32" fill="none" strokeWidth="2.8" />
              </>
            )
          ) : null}

          {spec.equipment === "bodyweight" ? (
            <>
              <rect x="15" y="42" width="34" height="6" rx="3" />
              {spec.kind === "core" ? <path d="M22 39 L30 34 L42 34" fill="none" strokeWidth="2.8" /> : null}
              {spec.kind !== "core" ? <path d="M22 38 L42 38" fill="none" strokeWidth="2.8" /> : null}
            </>
          ) : null}
        </g>

        <g className="text-[rgb(var(--text))]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="21" y="48" width="22" height="12" rx="3" className="opacity-90" />
          {movementCue(spec.kind)}
          {spec.kind === "calf_raise" ? <circle cx="40" cy="58" r="1.2" stroke="none" fill="currentColor" /> : null}
        </g>
      </svg>
    </div>
  );
}
