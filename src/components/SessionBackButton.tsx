"use client";

import { BackButton } from "@/components/ui/BackButton";

export function SessionBackButton() {
  return (
    <BackButton
      label="Back"
      ariaLabel="Back to Today"
      onClick={() => {
        const closeRequestEvent = new CustomEvent<{ closed: boolean }>("session-exercise-focus:close-request", {
          detail: { closed: false },
        });

        window.dispatchEvent(closeRequestEvent);
      }}
    />
  );
}
