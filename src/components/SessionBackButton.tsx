"use client";

import { TopRightBackButton } from "@/components/ui/TopRightBackButton";

export function SessionBackButton() {
  return (
    <TopRightBackButton
      ariaLabel="Back to Today"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("session-exercise-focus:close-request"),
        );
      }}
    />
  );
}
