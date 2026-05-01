"use client";

import { useSearchParams } from "next/navigation";

export function useInstallContextOverride(initialOverride: string | null = null) {
  const searchParams = useSearchParams();
  return searchParams.get("installContext") ?? initialOverride;
}
