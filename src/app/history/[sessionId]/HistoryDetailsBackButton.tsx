"use client";

import { useRouter } from "next/navigation";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

export function HistoryDetailsBackButton({ returnHref }: { returnHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push(returnHref);
      }}
      className={getAppButtonClassName({ variant: "secondary", size: "sm" })}
    >
      Back
    </button>
  );
}
