"use client";

import { useRouter } from "next/navigation";

type Props = {
  href: string;
  hasUnsavedChanges?: boolean;
};

export function RoutineBackButton({ href, hasUnsavedChanges = true }: Props) {
  const router = useRouter();

  function handleBack() {
    if (hasUnsavedChanges && !window.confirm("Discard changes?")) {
      return;
    }

    router.push(href);
  }

  return (
    <button type="button" onClick={handleBack} className="text-sm underline">
      Back
    </button>
  );
}
