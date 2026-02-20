"use client";

import { useEffect, useRef } from "react";

type DrawOptions = {
  width: number;
  height: number;
  time: number;
};

function drawFrame(ctx: CanvasRenderingContext2D, { width, height, time }: DrawOptions) {
  ctx.clearRect(0, 0, width, height);

  const graphite = ctx.createLinearGradient(0, 0, 0, height);
  graphite.addColorStop(0, "#101215");
  graphite.addColorStop(0.5, "#181b1f");
  graphite.addColorStop(1, "#0c0e11");
  ctx.fillStyle = graphite;
  ctx.fillRect(0, 0, width, height);

  // Fog layers
  for (let i = 0; i < 3; i += 1) {
    const y = height * (0.2 + i * 0.28);
    const speed = 0.03 + i * 0.012;
    const amp = 18 + i * 12;
    const alpha = 0.08 - i * 0.015;

    const fogGradient = ctx.createLinearGradient(0, y - 60, 0, y + 60);
    fogGradient.addColorStop(0, `rgba(200, 205, 210, 0)`);
    fogGradient.addColorStop(0.5, `rgba(200, 205, 210, ${alpha})`);
    fogGradient.addColorStop(1, `rgba(200, 205, 210, 0)`);

    ctx.fillStyle = fogGradient;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += 18) {
      const wave = Math.sin((x / width) * 8 + time * speed + i * 1.7) * amp;
      ctx.lineTo(x, y + wave);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  }

  // Vertical waterfall flow
  for (let i = 0; i < 26; i += 1) {
    const x = (i / 25) * width;
    const drift = Math.sin(i * 2.31 + time * 0.08) * 6;
    const phase = (time * 16 + i * 43) % (height + 140);
    const head = phase - 140;

    const flow = ctx.createLinearGradient(0, head, 0, head + 180);
    flow.addColorStop(0, "rgba(150, 160, 168, 0)");
    flow.addColorStop(0.55, "rgba(160, 170, 178, 0.05)");
    flow.addColorStop(1, "rgba(150, 160, 168, 0)");

    ctx.strokeStyle = flow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + drift, head);
    ctx.lineTo(x - drift * 0.45, head + 180);
    ctx.stroke();
  }

  // Bone/ivory sigil overlay
  const cx = width / 2;
  const cy = height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(time * 0.03) * 0.04);
  ctx.strokeStyle = "rgba(235, 230, 215, 0.08)";
  ctx.lineWidth = 1;

  const rings = [70, 115, 160];
  rings.forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let n = 0; n < 6 + index * 2; n += 1) {
      const angle = (Math.PI * 2 * n) / (6 + index * 2) + time * 0.01 * (index + 1);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(px * 0.82, py * 0.82);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  });

  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.restore();

  // Scanlines
  ctx.fillStyle = "rgba(245, 245, 240, 0.03)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }

  // Grain
  const noiseStep = 3;
  for (let y = 0; y < height; y += noiseStep) {
    for (let x = 0; x < width; x += noiseStep) {
      const n = (Math.sin(x * 12.9898 + y * 78.233 + time * 0.5) + 1) * 0.5;
      if (n > 0.7) {
        const alpha = (n - 0.7) * 0.06;
        ctx.fillStyle = `rgba(220, 220, 220, ${alpha})`;
        ctx.fillRect(x, y, noiseStep, noiseStep);
      }
    }
  }
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return;
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = reducedMotionQuery.matches;
    let hidden = document.hidden;
    let raf = 0;
    let lastFrame = 0;
    const fpsInterval = 1000 / 30;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawFrame(context, {
        width,
        height,
        time: performance.now() / 1000,
      });
    };

    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden && !prefersReducedMotion) {
        lastFrame = 0;
      }
    };

    const onReducedMotion = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        drawFrame(context, {
          width: window.innerWidth,
          height: window.innerHeight,
          time: performance.now() / 1000,
        });
      } else {
        lastFrame = 0;
      }
    };

    const animate = (timestamp: number) => {
      raf = window.requestAnimationFrame(animate);

      if (hidden || prefersReducedMotion) {
        return;
      }

      if (lastFrame && timestamp - lastFrame < fpsInterval) {
        return;
      }

      lastFrame = timestamp;
      drawFrame(context, {
        width: window.innerWidth,
        height: window.innerHeight,
        time: timestamp / 1000,
      });
    };

    resize();
    raf = window.requestAnimationFrame(animate);

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotionQuery.addEventListener("change", onReducedMotion);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotionQuery.removeEventListener("change", onReducedMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
