"use client";

import { useEffect } from "react";

type PreviousStyleSnapshot = {
  bodyOverflow: string;
  htmlOverflow: string;
  bodyOverscrollBehavior: string;
  htmlOverscrollBehavior: string;
};

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    const html = document.documentElement;
    const previous: PreviousStyleSnapshot = {
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    html.style.overscrollBehavior = "contain";

    return () => {
      body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
    };
  }, [active]);
}

