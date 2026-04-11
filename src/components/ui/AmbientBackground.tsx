"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type AmbientPresetName = "world" | "detail" | "focus" | "quiet";

type AmbientPreset = {
  name: AmbientPresetName;
  allowIdleBloom: boolean;
  activeParallax: string;
  idleParallax: string;
  activeMotionBoost: string;
  idleMotionBoost: string;
  style: CSSProperties;
};

const AMBIENT_PRESETS: Record<AmbientPresetName, Omit<AmbientPreset, "name" | "allowIdleBloom">> = {
  world: {
    activeParallax: "0.38",
    idleParallax: "0.74",
    activeMotionBoost: "1",
    idleMotionBoost: "1.28",
    style: {
      "--ambient-wash-opacity": "1",
      "--ambient-wireframe-opacity": "0.08",
      "--ambient-ring-opacity": "0.068",
      "--ambient-lattice-opacity": "0.056",
      "--ambient-orb-one-duration": "54s",
      "--ambient-orb-two-duration": "72s",
      "--ambient-orb-three-duration": "94s",
      "--ambient-wireframe-duration": "166s",
      "--ambient-ring-motion-duration": "188s",
      "--ambient-ring-spin-duration": "136s",
      "--ambient-lattice-duration": "204s",
    } as CSSProperties,
  },
  detail: {
    activeParallax: "0",
    idleParallax: "0",
    activeMotionBoost: "1",
    idleMotionBoost: "1",
    style: {
      "--ambient-wash-opacity": "0.96",
      "--ambient-wireframe-opacity": "0.066",
      "--ambient-ring-opacity": "0.054",
      "--ambient-lattice-opacity": "0.046",
      "--ambient-orb-one-duration": "62s",
      "--ambient-orb-two-duration": "80s",
      "--ambient-orb-three-duration": "102s",
      "--ambient-wireframe-duration": "176s",
      "--ambient-ring-motion-duration": "198s",
      "--ambient-ring-spin-duration": "152s",
      "--ambient-lattice-duration": "214s",
    } as CSSProperties,
  },
  focus: {
    activeParallax: "0",
    idleParallax: "0",
    activeMotionBoost: "1",
    idleMotionBoost: "1",
    style: {
      "--ambient-wash-opacity": "0.92",
      "--ambient-wireframe-opacity": "0.05",
      "--ambient-ring-opacity": "0.04",
      "--ambient-lattice-opacity": "0.032",
      "--ambient-orb-one-duration": "74s",
      "--ambient-orb-two-duration": "92s",
      "--ambient-orb-three-duration": "116s",
      "--ambient-wireframe-duration": "188s",
      "--ambient-ring-motion-duration": "214s",
      "--ambient-ring-spin-duration": "168s",
      "--ambient-lattice-duration": "228s",
    } as CSSProperties,
  },
  quiet: {
    activeParallax: "0",
    idleParallax: "0",
    activeMotionBoost: "1",
    idleMotionBoost: "1",
    style: {
      "--ambient-wash-opacity": "0.88",
      "--ambient-wireframe-opacity": "0.028",
      "--ambient-ring-opacity": "0.022",
      "--ambient-lattice-opacity": "0.018",
      "--ambient-orb-one-duration": "88s",
      "--ambient-orb-two-duration": "110s",
      "--ambient-orb-three-duration": "134s",
      "--ambient-wireframe-duration": "204s",
      "--ambient-ring-motion-duration": "232s",
      "--ambient-ring-spin-duration": "192s",
      "--ambient-lattice-duration": "248s",
    } as CSSProperties,
  },
};

function resolveRegressionMarkerAmbientPath(screen: string | null, scenarioId: string | null): string | null {
  if (scenarioId === "edit-day-add-exercise") {
    return "/routines/edit/day/add-exercise";
  }

  switch (screen) {
    case "today":
      return "/today";
    case "session":
      return "/session/detail";
    case "routines":
      return "/routines";
    case "view-day":
      return "/routines/view-day";
    case "edit-day":
      return "/routines/edit/day";
    case "create-routine":
    case "edit-routine":
      return "/routines/edit";
    case "add-exercise":
      return "/session/add-exercise";
    case "history-sessions":
    case "history-exercises":
      return "/history";
    case "history-detail":
      return "/history/detail";
    case "settings":
      return "/settings";
    case "exercise-detail":
      return "/exercises/detail";
    default:
      return null;
  }
}

function resolveAmbientPreset(pathname: string | null): AmbientPreset {
  const normalizedPath = pathname ?? "/";

  if (normalizedPath.startsWith("/today")) {
    return { name: "world", allowIdleBloom: true, ...AMBIENT_PRESETS.world };
  }

  if (normalizedPath === "/history" || normalizedPath.startsWith("/history/exercises")) {
    return { name: "world", allowIdleBloom: true, ...AMBIENT_PRESETS.world };
  }

  if (normalizedPath.startsWith("/history/")) {
    return { name: "detail", allowIdleBloom: false, ...AMBIENT_PRESETS.detail };
  }

  if (normalizedPath.startsWith("/session/") && normalizedPath.includes("/add-exercise")) {
    return { name: "quiet", allowIdleBloom: false, ...AMBIENT_PRESETS.quiet };
  }

  if (normalizedPath.startsWith("/session/")) {
    return { name: "detail", allowIdleBloom: false, ...AMBIENT_PRESETS.detail };
  }

  if (normalizedPath.startsWith("/exercises/")) {
    return { name: "detail", allowIdleBloom: false, ...AMBIENT_PRESETS.detail };
  }

  if (normalizedPath.startsWith("/routines/") && normalizedPath.includes("/edit/day/")) {
    const presetName = normalizedPath.includes("/add-exercise") ? "quiet" : "focus";
    return { name: presetName, allowIdleBloom: false, ...AMBIENT_PRESETS[presetName] };
  }

  if (normalizedPath.startsWith("/routines/") && normalizedPath.includes("/days/")) {
    return { name: "world", allowIdleBloom: false, ...AMBIENT_PRESETS.world };
  }

  if (
    normalizedPath.startsWith("/auth") ||
    normalizedPath.startsWith("/reset-password") ||
    normalizedPath.startsWith("/settings")
  ) {
    return { name: "quiet", allowIdleBloom: false, ...AMBIENT_PRESETS.quiet };
  }

  if (normalizedPath.startsWith("/routines")) {
    return { name: "detail", allowIdleBloom: false, ...AMBIENT_PRESETS.detail };
  }

  return { name: "detail", allowIdleBloom: false, ...AMBIENT_PRESETS.detail };
}

function WireframeForm() {
  return (
    <svg viewBox="0 0 520 520" className="ambient-background__svg" aria-hidden="true" fill="none">
      <g className="ambient-background__shape-base">
        <path d="M260 34 419 126 419 310 260 402 101 310 101 126Z" />
        <path d="M260 82 377 149 377 287 260 354 143 287 143 149Z" />
        <path d="M260 130 335 172 335 264 260 306 185 264 185 172Z" />
      </g>
      <g className="ambient-background__shape-secondary">
        <path d="M260 34V402" />
        <path d="M101 126 260 218 419 126" />
        <path d="M101 310 260 218 419 310" />
        <path d="M143 149 260 218 377 149" />
        <path d="M143 287 260 218 377 287" />
      </g>
      <g className="ambient-background__shape-highlight">
        <path d="M185 172 260 218 335 172" />
        <path d="M185 264 260 218 335 264" />
      </g>
      <g className="ambient-background__shape-node">
        <circle cx="260" cy="34" r="2.4" />
        <circle cx="419" cy="126" r="2.2" />
        <circle cx="419" cy="310" r="2.2" />
        <circle cx="260" cy="402" r="2.4" />
        <circle cx="101" cy="310" r="2.2" />
        <circle cx="101" cy="126" r="2.2" />
        <circle cx="260" cy="218" r="2.2" />
      </g>
    </svg>
  );
}

function MandalaRing() {
  return (
    <svg viewBox="0 0 520 520" className="ambient-background__svg" aria-hidden="true" fill="none">
      <g className="ambient-background__shape-secondary">
        <circle cx="260" cy="260" r="178" />
        <circle cx="260" cy="260" r="146" />
        <path d="M260 82V438" strokeDasharray="4 16" />
        <path d="M82 260H438" strokeDasharray="4 16" />
      </g>
      <g className="ambient-background__shape-base">
        <circle cx="260" cy="260" r="112" />
        <circle cx="260" cy="260" r="74" />
        <path d="M260 136 384 260 260 384 136 260Z" />
      </g>
      <g className="ambient-background__shape-highlight">
        <path d="M134 134 386 386" strokeDasharray="4 18" />
        <path d="M386 134 134 386" strokeDasharray="4 18" />
        <circle cx="260" cy="260" r="36" />
      </g>
      <g className="ambient-background__shape-gold">
        <circle cx="260" cy="260" r="202" strokeDasharray="1 20" />
      </g>
      <g className="ambient-background__shape-node">
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
    <svg viewBox="0 0 720 520" className="ambient-background__svg" aria-hidden="true" fill="none">
      <g className="ambient-background__shape-base">
        <path d="M58 322 132 280 206 322 206 408 132 450 58 408Z" />
        <path d="M206 322 280 280 354 322 354 408 280 450 206 408Z" />
        <path d="M354 322 428 280 502 322 502 408 428 450 354 408Z" />
        <path d="M132 194 206 152 280 194 280 280 206 322 132 280Z" />
        <path d="M280 194 354 152 428 194 428 280 354 322 280 280Z" />
        <path d="M428 194 502 152 576 194 576 280 502 322 428 280Z" />
      </g>
      <g className="ambient-background__shape-secondary">
        <path d="M132 280 206 322 280 280 354 322 428 280 502 322" />
        <path d="M132 194 206 236 280 194 354 236 428 194 502 236 576 194" />
        <path d="M132 450 206 408 280 450 354 408 428 450 502 408" />
        <path d="M206 152V450" />
        <path d="M354 152V408" />
        <path d="M502 152V322" />
      </g>
      <g className="ambient-background__shape-highlight">
        <path d="M58 408 206 322 354 408 502 322 650 408" strokeDasharray="5 18" />
        <path d="M132 280 280 194 428 280 576 194" strokeDasharray="5 18" />
      </g>
      <g className="ambient-background__shape-node">
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

export function AmbientBackground() {
  const pathname = usePathname();
  const preset = resolveAmbientPreset(pathname);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const idleStateRef = useRef(false);
  const [isIdleBloomActive, setIsIdleBloomActive] = useState(false);

  useEffect(() => {
    idleStateRef.current = isIdleBloomActive;
  }, [isIdleBloomActive]);

  useEffect(() => {
    const node = layerRef.current;
    if (!node || pathname !== "/dev/mobile-regression") return;

    const marker = document.querySelector<HTMLElement>("[data-mobile-regression-screen]");
    const markerPath = resolveRegressionMarkerAmbientPath(
      marker?.dataset.mobileRegressionScreen ?? null,
      marker?.dataset.mobileRegressionId ?? null,
    );
    if (!markerPath) return;

    const markerPreset = resolveAmbientPreset(markerPath);
    node.dataset.ambientPreset = markerPreset.name;

    for (const [property, value] of Object.entries(markerPreset.style)) {
      if (typeof value === "string") {
        node.style.setProperty(property, value);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const node = layerRef.current;
    if (!node) return;

    node.style.setProperty("--ambient-pointer-x", "0");
    node.style.setProperty("--ambient-pointer-y", "0");
    idleStateRef.current = false;
    setIsIdleBloomActive(false);

    if (!preset.allowIdleBloom) return;

    let frameId = 0;
    let idleTimeout = 0;
    let nextPointerX = 0;
    let nextPointerY = 0;

    const flushPointer = () => {
      frameId = 0;
      node.style.setProperty("--ambient-pointer-x", nextPointerX.toFixed(4));
      node.style.setProperty("--ambient-pointer-y", nextPointerY.toFixed(4));
    };

    const setPointer = (clientX: number, clientY: number) => {
      const safeWidth = Math.max(window.innerWidth, 1);
      const safeHeight = Math.max(window.innerHeight, 1);
      nextPointerX = ((clientX / safeWidth) - 0.5) * 2;
      nextPointerY = ((clientY / safeHeight) - 0.5) * 2;

      if (frameId) return;
      frameId = window.requestAnimationFrame(flushPointer);
    };

    const clearIdleBloom = () => {
      if (!idleStateRef.current) return;
      idleStateRef.current = false;
      setIsIdleBloomActive(false);
    };

    const armIdleBloom = () => {
      window.clearTimeout(idleTimeout);
      idleTimeout = window.setTimeout(() => {
        idleStateRef.current = true;
        setIsIdleBloomActive(true);
      }, 4800);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      setPointer(event.clientX, event.clientY);
      clearIdleBloom();
      armIdleBloom();
    };

    const handlePointerDown = (event: PointerEvent) => {
      setPointer(event.clientX, event.clientY);
      clearIdleBloom();
      armIdleBloom();
    };

    const handleKeyDown = () => {
      clearIdleBloom();
      armIdleBloom();
    };

    armIdleBloom();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      window.clearTimeout(idleTimeout);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, preset.allowIdleBloom]);

  const layerStyle = {
    ...preset.style,
    "--ambient-parallax-multiplier": preset.allowIdleBloom
      ? isIdleBloomActive
        ? preset.idleParallax
        : preset.activeParallax
      : "0",
    "--ambient-motion-boost": preset.allowIdleBloom
      ? isIdleBloomActive
        ? preset.idleMotionBoost
        : preset.activeMotionBoost
      : preset.activeMotionBoost,
  } as CSSProperties;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="ambient-background"
      data-ambient-preset={preset.name}
      data-ambient-idle={isIdleBloomActive ? "true" : "false"}
      style={layerStyle}
    >
      <div className="ambient-background__depth" />
      <div className="ambient-background__orb ambient-background__orb--one" />
      <div className="ambient-background__orb ambient-background__orb--two" />
      <div className="ambient-background__orb ambient-background__orb--three" />

      <div className="ambient-background__geometry-shell ambient-background__geometry-shell--wireframe">
        <div className="ambient-background__geometry-motion ambient-background__geometry-motion--wireframe">
          <WireframeForm />
        </div>
      </div>

      <div className="ambient-background__geometry-shell ambient-background__geometry-shell--ring">
        <div className="ambient-background__geometry-motion ambient-background__geometry-motion--ring">
          <div className="ambient-background__geometry-spin ambient-background__geometry-spin--ring">
            <MandalaRing />
          </div>
        </div>
      </div>

      <div className="ambient-background__geometry-shell ambient-background__geometry-shell--lattice">
        <div className="ambient-background__geometry-motion ambient-background__geometry-motion--lattice">
          <MazeLattice />
        </div>
      </div>

      <div className="ambient-background__veil" />
    </div>
  );
}
