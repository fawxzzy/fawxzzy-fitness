import type { CSSProperties, ReactNode } from "react";
import { ambientBackdropTuning, type AmbientPreset } from "@/lib/ambient/tuning";

type AppAmbientBackdropProps = {
  preset: AmbientPreset;
};

type PeripheralDescriptor = {
  key: string;
  left: string;
  top: string;
  sizePx: number;
  alphaSeed: number;
  durationSeed: number;
  delayMs: number;
  dxFactor: number;
  dyFactor: number;
};

type HazeDescriptor = {
  key: string;
  className: string;
  alphaSeed: number;
  durationMs: number;
  delayMs: number;
  dx: number;
  dy: number;
};

type AmbientGlyph = () => ReactNode;

type GeometryDescriptor = {
  key: string;
  className: string;
  alphaSeed: number;
  durationSeed: number;
  delayMs: number;
  driftX: number;
  driftY: number;
  scaleSeed: number;
  strokeSeed: number;
  glyph: AmbientGlyph;
};

function createSeededRandom(seed: number) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967295;
  };
}

function interpolate(min: number, max: number, seed: number) {
  return min + ((max - min) * seed);
}

function formatUnit(value: number) {
  return Number(value.toFixed(4)).toString();
}

function createPeripheralDescriptors(
  count: number,
  seed: number,
  sizeMinPx: number,
  sizeMaxPx: number,
): PeripheralDescriptor[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const edge = index % 4;
    const along = interpolate(9, 91, random());
    const inset = interpolate(3, 18, random());

    let left = `${along.toFixed(2)}%`;
    let top = `${inset.toFixed(2)}%`;

    if (edge === 1) {
      left = `${(100 - inset).toFixed(2)}%`;
      top = `${along.toFixed(2)}%`;
    } else if (edge === 2) {
      left = `${along.toFixed(2)}%`;
      top = `${(100 - inset).toFixed(2)}%`;
    } else if (edge === 3) {
      left = `${inset.toFixed(2)}%`;
      top = `${along.toFixed(2)}%`;
    }

    return {
      key: `particle-${index}`,
      left,
      top,
      sizePx: interpolate(sizeMinPx, sizeMaxPx, random()),
      alphaSeed: random(),
      durationSeed: random(),
      delayMs: Math.round(interpolate(0, 7200, random())),
      dxFactor: interpolate(-1, 1, random()),
      dyFactor: interpolate(-1, 1, random()),
    };
  });
}

function WireframeGlyph() {
  return (
    <svg viewBox="0 0 520 520" className="app-ambient__svg" aria-hidden="true" fill="none">
      <g className="app-ambient__shape-base">
        <path d="M260 34 419 126 419 310 260 402 101 310 101 126Z" />
        <path d="M260 82 377 149 377 287 260 354 143 287 143 149Z" />
        <path d="M260 130 335 172 335 264 260 306 185 264 185 172Z" />
      </g>
      <g className="app-ambient__shape-secondary">
        <path d="M260 34V402" />
        <path d="M101 126 260 218 419 126" />
        <path d="M101 310 260 218 419 310" />
        <path d="M143 149 260 218 377 149" />
        <path d="M143 287 260 218 377 287" />
      </g>
      <g className="app-ambient__shape-highlight">
        <path d="M185 172 260 218 335 172" />
        <path d="M185 264 260 218 335 264" />
      </g>
      <g className="app-ambient__shape-node">
        <circle cx="260" cy="34" r="2.2" />
        <circle cx="419" cy="126" r="2.1" />
        <circle cx="419" cy="310" r="2.1" />
        <circle cx="260" cy="402" r="2.2" />
        <circle cx="101" cy="310" r="2.1" />
        <circle cx="101" cy="126" r="2.1" />
        <circle cx="260" cy="218" r="2.1" />
      </g>
    </svg>
  );
}

function MandalaRing() {
  return (
    <svg viewBox="0 0 520 520" className="app-ambient__svg" aria-hidden="true" fill="none">
      <g className="app-ambient__shape-secondary">
        <circle cx="260" cy="260" r="178" />
        <circle cx="260" cy="260" r="146" />
        <path d="M260 82V438" strokeDasharray="4 16" />
        <path d="M82 260H438" strokeDasharray="4 16" />
      </g>
      <g className="app-ambient__shape-base">
        <circle cx="260" cy="260" r="112" />
        <circle cx="260" cy="260" r="74" />
        <path d="M260 136 384 260 260 384 136 260Z" />
      </g>
      <g className="app-ambient__shape-highlight">
        <path d="M134 134 386 386" strokeDasharray="4 18" />
        <path d="M386 134 134 386" strokeDasharray="4 18" />
        <circle cx="260" cy="260" r="36" />
      </g>
      <g className="app-ambient__shape-gold">
        <circle cx="260" cy="260" r="202" strokeDasharray="1 20" />
      </g>
      <g className="app-ambient__shape-node">
        <circle cx="260" cy="82" r="2.1" />
        <circle cx="438" cy="260" r="2.1" />
        <circle cx="260" cy="438" r="2.1" />
        <circle cx="82" cy="260" r="2.1" />
      </g>
    </svg>
  );
}

function MazeLattice() {
  return (
    <svg viewBox="0 0 720 520" className="app-ambient__svg" aria-hidden="true" fill="none">
      <g className="app-ambient__shape-base">
        <path d="M58 322 132 280 206 322 206 408 132 450 58 408Z" />
        <path d="M206 322 280 280 354 322 354 408 280 450 206 408Z" />
        <path d="M354 322 428 280 502 322 502 408 428 450 354 408Z" />
        <path d="M132 194 206 152 280 194 280 280 206 322 132 280Z" />
        <path d="M280 194 354 152 428 194 428 280 354 322 280 280Z" />
        <path d="M428 194 502 152 576 194 576 280 502 322 428 280Z" />
      </g>
      <g className="app-ambient__shape-secondary">
        <path d="M132 280 206 322 280 280 354 322 428 280 502 322" />
        <path d="M132 194 206 236 280 194 354 236 428 194 502 236 576 194" />
        <path d="M132 450 206 408 280 450 354 408 428 450 502 408" />
        <path d="M206 152V450" />
        <path d="M354 152V408" />
        <path d="M502 152V322" />
      </g>
      <g className="app-ambient__shape-highlight">
        <path d="M58 408 206 322 354 408 502 322 650 408" strokeDasharray="5 18" />
        <path d="M132 280 280 194 428 280 576 194" strokeDasharray="5 18" />
      </g>
      <g className="app-ambient__shape-node">
        <circle cx="206" cy="152" r="2.1" />
        <circle cx="354" cy="152" r="2.1" />
        <circle cx="502" cy="152" r="2.1" />
        <circle cx="132" cy="450" r="2.1" />
        <circle cx="280" cy="450" r="2.1" />
        <circle cx="428" cy="450" r="2.1" />
      </g>
    </svg>
  );
}

const HAZE_DESCRIPTORS: HazeDescriptor[] = [
  {
    key: "haze-one",
    className: "app-ambient__haze app-ambient__haze--one",
    alphaSeed: 0.78,
    durationMs: 112000,
    delayMs: 0,
    dx: 12,
    dy: 8,
  },
  {
    key: "haze-two",
    className: "app-ambient__haze app-ambient__haze--two",
    alphaSeed: 0.52,
    durationMs: 138000,
    delayMs: 1800,
    dx: -10,
    dy: 10,
  },
  {
    key: "haze-three",
    className: "app-ambient__haze app-ambient__haze--three",
    alphaSeed: 0.32,
    durationMs: 164000,
    delayMs: 3200,
    dx: 8,
    dy: -11,
  },
];

const GEOMETRY_DESCRIPTORS: GeometryDescriptor[] = [
  {
    key: "lattice",
    className: "app-ambient__geometry-shell app-ambient__geometry-shell--lattice",
    alphaSeed: 0.34,
    durationSeed: 0.18,
    delayMs: 0,
    driftX: 1,
    driftY: -0.72,
    scaleSeed: 0.56,
    strokeSeed: 0.78,
    glyph: MazeLattice,
  },
  {
    key: "ring",
    className: "app-ambient__geometry-shell app-ambient__geometry-shell--ring",
    alphaSeed: 0.68,
    durationSeed: 0.44,
    delayMs: 2200,
    driftX: -0.68,
    driftY: -1,
    scaleSeed: 0.44,
    strokeSeed: 0.42,
    glyph: MandalaRing,
  },
  {
    key: "wireframe",
    className: "app-ambient__geometry-shell app-ambient__geometry-shell--wireframe",
    alphaSeed: 0.92,
    durationSeed: 0.76,
    delayMs: 4400,
    driftX: -0.58,
    driftY: 0.82,
    scaleSeed: 0.64,
    strokeSeed: 0.26,
    glyph: WireframeGlyph,
  },
];

const TWINKLE_DESCRIPTORS = createPeripheralDescriptors(
  ambientBackdropTuning.sky.twinkleCount,
  0x4f1b_35a1,
  1.5,
  3.3,
);

const MOTE_DESCRIPTORS = createPeripheralDescriptors(
  ambientBackdropTuning.sky.driftMoteCount,
  0x1d5a_7b41,
  5,
  10,
);

export function AppAmbientBackdrop({ preset }: AppAmbientBackdropProps) {
  const presetTuning = ambientBackdropTuning.presets[preset];
  const skyTuning = ambientBackdropTuning.sky;
  const geometryTuning = ambientBackdropTuning.geometry;
  const twinkleDriftRange = skyTuning.twinkleDriftRangePx * presetTuning.motionMultiplier;
  const geometryDriftRange = geometryTuning.driftRangePx * presetTuning.motionMultiplier;

  const rootStyle = {
    "--app-ambient-reduced-motion-multiplier": formatUnit(ambientBackdropTuning.reducedMotion.motionMultiplier),
    "--app-ambient-reduced-twinkle-multiplier": formatUnit(ambientBackdropTuning.reducedMotion.twinkleMultiplier),
    "--app-ambient-reduced-geometry-multiplier": formatUnit(ambientBackdropTuning.reducedMotion.geometryMultiplier),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="app-ambient"
      data-ambient-preset={preset}
      style={rootStyle}
    >
      <div className="app-ambient__depth" />

      {HAZE_DESCRIPTORS.slice(0, skyTuning.hazeLayerCount).map((layer) => {
        const alpha = interpolate(skyTuning.hazeAlphaMin, skyTuning.hazeAlphaMax, layer.alphaSeed) * presetTuning.intensity;
        const alphaPeak = Math.min(alpha * 1.15, skyTuning.hazeAlphaMax * presetTuning.intensity * 1.08);

        return (
          <div
            key={layer.key}
            className={layer.className}
            style={{
              animationDuration: `${layer.durationMs}ms`,
              animationDelay: `${layer.delayMs}ms`,
              "--app-ambient-alpha": formatUnit(alpha),
              "--app-ambient-alpha-peak": formatUnit(alphaPeak),
              "--app-ambient-dx": `${(layer.dx * presetTuning.motionMultiplier).toFixed(2)}px`,
              "--app-ambient-dy": `${(layer.dy * presetTuning.motionMultiplier).toFixed(2)}px`,
            } as CSSProperties}
          />
        );
      })}

      {GEOMETRY_DESCRIPTORS.slice(0, geometryTuning.layerCount).map((layer) => {
        const Glyph = layer.glyph;
        const alpha = interpolate(geometryTuning.layerAlphaMin, geometryTuning.layerAlphaMax, layer.alphaSeed)
          * presetTuning.intensity
          * presetTuning.geometryMultiplier;
        const alphaPeak = Math.min(
          alpha * 1.3,
          geometryTuning.layerAlphaMax * presetTuning.intensity * presetTuning.geometryMultiplier,
        );
        const duration = interpolate(
          geometryTuning.rotationDurationMinMs,
          geometryTuning.rotationDurationMaxMs,
          layer.durationSeed,
        );
        const driftX = geometryDriftRange * layer.driftX;
        const driftY = geometryDriftRange * layer.driftY;
        const scaleStart = 1 + ((geometryTuning.scalePulseMin - 1) * presetTuning.motionMultiplier);
        const scalePeak = 1 + ((geometryTuning.scalePulseMax - 1) * presetTuning.motionMultiplier * (0.82 + (layer.scaleSeed * 0.28)));
        const strokeWidth = interpolate(geometryTuning.strokeWidthMin, geometryTuning.strokeWidthMax, layer.strokeSeed);

        return (
          <div key={layer.key} className={layer.className}>
            <div
              className="app-ambient__geometry-motion"
              style={{
                animationDuration: `${Math.round(duration)}ms`,
                animationDelay: `${layer.delayMs}ms`,
                "--app-ambient-alpha": formatUnit(alpha),
                "--app-ambient-alpha-peak": formatUnit(alphaPeak),
                "--app-ambient-dx": `${driftX.toFixed(2)}px`,
                "--app-ambient-dy": `${driftY.toFixed(2)}px`,
                "--app-ambient-scale-start": formatUnit(scaleStart),
                "--app-ambient-scale-peak": formatUnit(scalePeak),
                "--app-ambient-stroke-width": formatUnit(strokeWidth),
              } as CSSProperties}
            >
              <div
                className="app-ambient__geometry-spin"
                style={{
                  animationDuration: `${Math.round(duration)}ms`,
                  animationDelay: `${layer.delayMs}ms`,
                }}
              >
                <Glyph />
              </div>
            </div>
          </div>
        );
      })}

      <div className="app-ambient__mote-layer">
        {MOTE_DESCRIPTORS.map((mote, index) => {
          const alpha = interpolate(skyTuning.driftMoteAlphaMin, skyTuning.driftMoteAlphaMax, mote.alphaSeed)
            * presetTuning.intensity;
          const alphaPeak = Math.min(alpha * 1.16, skyTuning.driftMoteAlphaMax * presetTuning.intensity);
          const speed = interpolate(
            skyTuning.driftMoteSpeedPxPerSecMin,
            skyTuning.driftMoteSpeedPxPerSecMax,
            mote.durationSeed,
          ) * Math.max(presetTuning.motionMultiplier, 0.2);
          const travelY = 42 + (index * 14) + interpolate(6, 28, mote.durationSeed);
          const durationMs = Math.round((travelY / Math.max(speed, 0.12)) * 1000);
          const travelX = interpolate(-12, 12, mote.dxFactor * 0.5 + 0.5) * presetTuning.motionMultiplier;

          return (
            <span
              key={mote.key}
              className="app-ambient__mote"
              style={{
                left: mote.left,
                top: mote.top,
                width: `${mote.sizePx.toFixed(2)}px`,
                height: `${mote.sizePx.toFixed(2)}px`,
                animationDuration: `${durationMs}ms`,
                animationDelay: `${mote.delayMs}ms`,
                "--app-ambient-alpha": formatUnit(alpha),
                "--app-ambient-alpha-peak": formatUnit(alphaPeak),
                "--app-ambient-travel-x": `${travelX.toFixed(2)}px`,
                "--app-ambient-travel-y": `${travelY.toFixed(2)}px`,
              } as CSSProperties}
            />
          );
        })}
      </div>

      <div className="app-ambient__twinkle-layer">
        {TWINKLE_DESCRIPTORS.map((twinkle) => {
          const alpha = interpolate(skyTuning.twinkleAlphaMin, skyTuning.twinkleAlphaMax, twinkle.alphaSeed)
            * presetTuning.intensity
            * presetTuning.twinkleMultiplier;
          const alphaPeak = Math.min(
            alpha * 1.35,
            skyTuning.twinkleAlphaMax * presetTuning.intensity * presetTuning.twinkleMultiplier,
          );
          const durationMs = interpolate(
            skyTuning.twinklePulseDurationMinMs,
            skyTuning.twinklePulseDurationMaxMs,
            twinkle.durationSeed,
          );

          return (
            <span
              key={twinkle.key}
              className="app-ambient__twinkle"
              style={{
                left: twinkle.left,
                top: twinkle.top,
                width: `${twinkle.sizePx.toFixed(2)}px`,
                height: `${twinkle.sizePx.toFixed(2)}px`,
                animationDuration: `${Math.round(durationMs)}ms`,
                animationDelay: `${twinkle.delayMs}ms`,
                "--app-ambient-alpha": formatUnit(alpha),
                "--app-ambient-alpha-peak": formatUnit(alphaPeak),
                "--app-ambient-dx": `${(twinkle.dxFactor * twinkleDriftRange).toFixed(2)}px`,
                "--app-ambient-dy": `${(twinkle.dyFactor * twinkleDriftRange).toFixed(2)}px`,
              } as CSSProperties}
            />
          );
        })}
      </div>

      <div className="app-ambient__veil" />
    </div>
  );
}
