"use client";

import { BackButton } from "@/components/ui/BackButton";

type Props = {
  href: string;
  hasUnsavedChanges?: boolean;
};

export function RoutineBackButton({ href, hasUnsavedChanges = true }: Props) {
  return (
    <BackButton
      href={href}
      onClick={(event) => {
        if (hasUnsavedChanges && !window.confirm("Discard changes?")) {
          event.preventDefault();
        }
      }}
    />
  );
}
