"use client";

import { useEffect } from "react";

type PreviousStyleSnapshot = {
  bodyOverflow: string;
  bodyTouchAction: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlTouchAction: string;
};

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const previous: PreviousStyleSnapshot = {
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlTouchAction: html.style.touchAction,
    };

    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    html.style.touchAction = "none";

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      html.style.overflow = previous.htmlOverflow;
      html.style.touchAction = previous.htmlTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

