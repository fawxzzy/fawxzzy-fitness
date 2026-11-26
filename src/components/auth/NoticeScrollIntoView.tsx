"use client";

import { useEffect, useRef } from "react";

/**
 * Renders nothing. When it mounts inside a notice it scrolls that notice into view (block "nearest", so nothing moves
 * when it is already visible). On a 320x568 phone the auth body is a short scroller and a two-line notice can land
 * below its fold with no cue; this keeps a freshly shown message on screen. Guarded: jsdom has no scrollIntoView.
 */
export function NoticeScrollIntoView() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const box = ref.current?.parentElement;
    if (box && typeof box.scrollIntoView === "function") box.scrollIntoView({ block: "nearest" });
  }, []);
  return <span ref={ref} hidden aria-hidden="true" />;
}
