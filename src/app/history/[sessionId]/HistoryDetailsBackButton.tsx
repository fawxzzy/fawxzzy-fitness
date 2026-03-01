"use client";

import { BackButton } from "@/components/ui/BackButton";

export function HistoryDetailsBackButton({ returnHref }: { returnHref: string }) {
  return <BackButton href={returnHref} label="Back" ariaLabel="Back to History" />;
}
