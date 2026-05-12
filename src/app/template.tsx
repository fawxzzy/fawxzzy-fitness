"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div
        key={pathname}
        className="absolute inset-0 flex min-h-0 flex-col"
      >
        {children}
      </div>
    </div>
  );
}
