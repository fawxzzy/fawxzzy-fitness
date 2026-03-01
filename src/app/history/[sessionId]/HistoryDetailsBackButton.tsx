"use client";

import { useRouter } from "next/navigation";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

export function HistoryDetailsBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && document.referrer.startsWith(window.location.origin)) {
          router.back();
          return;
        }

        router.push("/history");
      }}
      className={getAppButtonClassName({ variant: "secondary", size: "sm" })}
    >
      Back
    </button>
  );
}
