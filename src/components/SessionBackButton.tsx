"use client";

import { useRouter } from "next/navigation";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";

export function SessionBackButton({ href = "/today" }: { href?: string }) {
  const router = useRouter();

  return (
    <TopRightBackButton
      href={href}
      ariaLabel="Back to Today"
      historyBehavior="fallback-only"
      onClick={(event) => {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent("session-exercise-focus:close-request"),
        );
        router.push(href);
      }}
    />
  );
}
