"use client";

import { useEffect } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";

export function LiveExerciseInfoPreview({
  exercise,
  stats,
  initialScrollY = 0,
}: {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
  initialScrollY?: number;
}) {
  useEffect(() => {
    if (initialScrollY <= 0) return;

    let attempts = 0;
    let timeoutId: ReturnType<Window["setTimeout"]> | null = null;

    const applyScroll = () => {
      attempts += 1;
      window.scrollTo({ top: initialScrollY, behavior: "instant" });
      document.scrollingElement?.scrollTo({ top: initialScrollY, behavior: "instant" });

      const pageScroll = document.querySelector(".app-page-scroll");
      if (pageScroll instanceof HTMLElement) {
        pageScroll.scrollTo({ top: initialScrollY, behavior: "instant" });
      }

      const currentTop = Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        pageScroll instanceof HTMLElement ? pageScroll.scrollTop : 0,
      );

      if (currentTop + 8 >= initialScrollY || attempts >= 20) {
        return;
      }

      timeoutId = window.setTimeout(applyScroll, 100);
    };

    const animationFrame = window.requestAnimationFrame(applyScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [initialScrollY]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const stretchTrayScroll = searchParams.get("stretchTrayScroll")?.trim().toLowerCase() ?? "";
    if (!stretchTrayScroll) {
      return;
    }

    let attempts = 0;
    let timeoutId: ReturnType<Window["setTimeout"]> | null = null;

    const applyTrayScroll = () => {
      attempts += 1;
      const viewport = document.querySelector(".picker-scroll-viewport");
      if (!(viewport instanceof HTMLElement)) {
        if (attempts < 20) {
          timeoutId = window.setTimeout(applyTrayScroll, 120);
        }
        return;
      }

      if (stretchTrayScroll === "bottom") {
        viewport.scrollTop = viewport.scrollHeight;
      } else if (stretchTrayScroll === "top") {
        viewport.scrollTop = 0;
      }

      if (attempts < 3) {
        timeoutId = window.setTimeout(applyTrayScroll, 120);
      }
    };

    const animationFrame = window.requestAnimationFrame(applyTrayScroll);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <ExerciseInfoSheet
      exercise={exercise}
      stats={stats}
      statsLoading={false}
      open
      inline
      onOpenChange={() => {}}
      onClose={() => {}}
    />
  );
}
