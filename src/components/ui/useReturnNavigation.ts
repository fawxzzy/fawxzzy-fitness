"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnContract } from "@/lib/navigation-return";
import { readStack } from "@/components/ui/useBackNavigation";

export function useReturnNavigation(fallbackHref?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  const returnContract = useMemo(
    () => getSafeReturnContract(currentPath, readStack(), fallbackHref),
    [currentPath, fallbackHref],
  );

  const navigateReturn = useCallback(() => {
    if (returnContract.useHistoryBack) {
      router.back();
      return returnContract.historyHref;
    }

    if (returnContract.fallbackReturnHref) {
      router.push(returnContract.fallbackReturnHref);
      return returnContract.fallbackReturnHref;
    }

    return null;
  }, [returnContract, router]);

  return {
    currentPath,
    returnHref: returnContract.returnHref,
    canReturn: Boolean(returnContract.returnHref),
    navigateReturn,
  };
}
