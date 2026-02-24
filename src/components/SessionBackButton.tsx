"use client";

import { BackButton } from "@/components/ui/BackButton";

export function SessionBackButton() {
  return (
    <BackButton
      label="Back"
      ariaLabel="Back to Today"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("session-exercise-focus:close-request"),
        );
      }}
    />
  );
}
