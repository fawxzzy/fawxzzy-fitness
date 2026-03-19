"use client";

import { useReturnNavigation } from "@/components/ui/useReturnNavigation";

export function NavigationReturnInput({ name = "returnTo", fallbackHref }: { name?: string; fallbackHref?: string }) {
  const { returnHref } = useReturnNavigation(fallbackHref);

  return <input type="hidden" name={name} value={returnHref ?? ""} />;
}
