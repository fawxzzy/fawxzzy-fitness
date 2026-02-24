"use client";

import { TopRightBackButton } from "@/components/ui/TopRightBackButton";

type Props = {
  href: string;
  hasUnsavedChanges?: boolean;
};

export function RoutineBackButton({ href, hasUnsavedChanges = true }: Props) {
  return (
    <TopRightBackButton
      href={href}
      onClick={(event) => {
        if (hasUnsavedChanges && !window.confirm("Discard changes?")) {
          event.preventDefault();
        }
      }}
    />
  );
}
