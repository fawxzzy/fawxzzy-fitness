"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnHref } from "@/components/ui/useBackNavigation";

export function useReturnNavigation(fallbackHref?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  const returnHref = useMemo(() => getSafeReturnHref(currentPath, fallbackHref), [currentPath, fallbackHref]);

  const navigateReturn = useCallback(() => {
    if (returnHref) {
      router.push(returnHref);
      return returnHref;
    }

    return null;
  }, [returnHref, router]);

  return {
    currentPath,
    returnHref,
    canReturn: Boolean(returnHref),
    navigateReturn,
  };
}
