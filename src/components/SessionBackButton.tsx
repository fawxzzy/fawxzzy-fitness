"use client";

import { TopRightBackButton } from "@/components/ui/TopRightBackButton";

export function SessionBackButton({ href = "/today" }: { href?: string }) {
  return (
    <TopRightBackButton
      href={href}
      ariaLabel="Back to Today"
      historyBehavior="fallback-only"
    />
  );
}
