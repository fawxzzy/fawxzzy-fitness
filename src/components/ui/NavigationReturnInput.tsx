"use client";

import { useReturnNavigation } from "@/components/ui/useReturnNavigation";

export function NavigationReturnInput({
  name = "returnTo",
  fallbackHref,
  value,
}: {
  name?: string;
  fallbackHref?: string;
  value?: string | null;
}) {
  const { returnHref } = useReturnNavigation(fallbackHref);

  return <input type="hidden" name={name} value={value ?? returnHref ?? ""} />;
}
