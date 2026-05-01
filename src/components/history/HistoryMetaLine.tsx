"use client";

import { SignatureDot } from "@/components/ui/app/SignatureSeparator";

export function HistoryMetaLine({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[12px] font-medium leading-[1.2]">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0 [text-wrap:balance]">{item}</span>
        </span>
      ))}
    </span>
  );
}
